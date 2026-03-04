import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const dir = path.join(process.cwd(), 'security-logs');
    const file = path.join(dir, 'events.jsonl');
    const entry = JSON.stringify({
      ...body,
      ip: request.headers.get('x-forwarded-for') || '',
      time: new Date().toISOString(),
    });
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch {}
    try {
      await fs.appendFile(file, entry + '\n', 'utf8');
    } catch {}
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}

