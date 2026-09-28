import { NextResponse } from 'next/server';
import { randomBytes, createHash, createHmac } from 'node:crypto';
export async function GET(req: Request) {
  if (
    !process.env.GOOGLE_CLIENT_ID ||
    !process.env.APP_BASE_URL ||
    !process.env.AUTH_SECRET
  )
    return NextResponse.json(
      { error: 'Google sign-in is not configured' },
      { status: 503 },
    );
  const state = randomBytes(24).toString('base64url'),
    verifier = randomBytes(32).toString('base64url'),
    nonce = randomBytes(24).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  const redirectUri = `${process.env.APP_BASE_URL}/api/google/callback/`;
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  Object.entries({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    prompt: 'select_account',
  }).forEach(([k, v]) => url.searchParams.set(k, v));
  const response = NextResponse.redirect(url);
  const secure = process.env.NODE_ENV === 'production';
  const payload = Buffer.from(
    JSON.stringify({ state, verifier, nonce }),
  ).toString('base64url');
  const signature = createHmac('sha256', process.env.AUTH_SECRET)
    .update(payload)
    .digest('base64url');
  response.cookies.set('tf_oauth', `${payload}.${signature}`, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });
  return response;
}
