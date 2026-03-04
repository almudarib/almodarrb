import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { DASHBOARD_PATH, LOGIN_PATH } from '@/lib/paths';

function parseToken(value: string | null): { exp?: number } | null {
  if (!value) return null;
  const parts = value.split('.');
  if (parts.length < 3) return null;
  try {
    const b64 = parts[1]!;
    const base64 = b64.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4 === 0 ? '' : '='.repeat(4 - (base64.length % 4));
    const raw = Buffer.from(base64 + pad, 'base64').toString('utf8');
    const obj = JSON.parse(raw) as { exp?: number };
    return obj;
  } catch {
    return null;
  }
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get('app_session')?.value ?? null;
  const payload = parseToken(token);
  const now = Math.floor(Date.now() / 1000);
  const valid = !!(payload && typeof payload.exp === 'number' && payload.exp > now);

  if (pathname.startsWith('/students')) {
    if (!valid) {
      const url = req.nextUrl.clone();
      url.pathname = LOGIN_PATH;
      url.search = '';
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (pathname.startsWith('/auth/login') && valid) {
    const url = req.nextUrl.clone();
    url.pathname = DASHBOARD_PATH;
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/students/:path*', '/auth/login'],
};

