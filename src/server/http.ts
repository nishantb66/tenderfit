import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
export function error(message: string, status = 400, code = 'BAD_REQUEST') {
  return NextResponse.json(
    { error: { code, message, correlationId: randomUUID() } },
    {
      status,
      headers:
        status === 423 || status === 503 ? { 'Retry-After': '30' } : undefined,
    },
  );
}
export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}
export function guardError(e: unknown) {
  const message = e instanceof Error ? e.message : 'Unexpected error';
  const status = message.includes('Sign in')
    ? 401
    : message.includes('Admin access') || message.includes('Switch to General')
      ? 403
      : message.includes('Rate limit')
        ? 429
        : message.includes('required')
          ? 503
          : 400;
  return error(
    message,
    status,
    status === 429
      ? 'RATE_LIMITED'
      : status === 503
        ? 'SETUP_REQUIRED'
        : 'BAD_REQUEST',
  );
}
export function sameOrigin(req: Request) {
  const origin = req.headers.get('origin');
  return !origin || origin === new URL(req.url).origin;
}
