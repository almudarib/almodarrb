import { cookies } from 'next/headers';
import { createHmac, randomBytes } from 'node:crypto';

export type AppSession = {
  id: number;
  name?: string;
  role?: string;
  exp: number;
};

const NAME = 'app_session';

function secret() {
  return process.env.APP_SESSION_SECRET || process.env.SESSION_SECRET || 'dev-secret';
}

function b64url(input: string | Buffer) {
  return Buffer.from(input).toString('base64url');
}

function fromB64url(input: string) {
  return Buffer.from(input, 'base64url').toString('utf8');
}

function sign(data: string, key: string) {
  return createHmac('sha256', key).update(data).digest('hex');
}

export function createSessionToken(payload: Omit<AppSession, 'exp'> & { exp?: number }) {
  const exp = payload.exp ?? Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7;
  const data = JSON.stringify({ ...payload, exp });
  const b64 = b64url(data);
  const sig = sign(b64, secret());
  return `v1.${b64}.${sig}`;
}

export function verifySessionToken(token: string): AppSession | null {
  try {
    const [v, b64, sig] = token.split('.');
    if (v !== 'v1' || !b64 || !sig) return null;
    const expSig = sign(b64, secret());
    if (expSig !== sig) return null;
    const raw = fromB64url(b64);
    const parsed = JSON.parse(raw) as AppSession;
    if (!parsed || typeof parsed.id !== 'number') return null;
    if (typeof parsed.exp !== 'number' || parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<AppSession | null> {
  const c = (await cookies()).get(NAME)?.value ?? '';
  if (!c) return null;
  return verifySessionToken(c);
}

export async function setSession(data: { id: number; name?: string; role?: string; maxAgeSec?: number }) {
  const exp = Math.floor(Date.now() / 1000) + (data.maxAgeSec ?? 60 * 60 * 24 * 7);
  const token = createSessionToken({ id: data.id, name: data.name, role: data.role, exp });
  (await cookies()).set(NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: data.maxAgeSec ?? 60 * 60 * 24 * 7,
    secure: process.env.NODE_ENV === 'production',
  });
}

export async function clearSession() {
  (await cookies()).set(NAME, '', { path: '/', maxAge: 0 });
}

export function newSessionNonce() {
  return randomBytes(8).toString('hex');
}
