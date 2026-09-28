import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { OAuth2Client } from 'google-auth-library';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { db } from '@/server/db';
import { issueSession, audit } from '@/server/auth';
import { isAdminEmail } from '@/config/admin';
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const stored = (await cookies()).get('tf_oauth')?.value;
  if (!stored || !params.get('code'))
    return NextResponse.redirect(new URL('/?error=signin', req.url));
  try {
    const [encoded, provided] = stored.split('.');
    const expected = createHmac('sha256', process.env.AUTH_SECRET!)
      .update(encoded)
      .digest('base64url');
    if (
      !provided ||
      !timingSafeEqual(Buffer.from(provided), Buffer.from(expected))
    )
      throw new Error('Invalid OAuth cookie');
    const { state, verifier, nonce } = JSON.parse(
      Buffer.from(encoded, 'base64url').toString(),
    );
    if (params.get('state') !== state) throw new Error('Invalid OAuth state');
    const redirectUri = `${process.env.APP_BASE_URL}/api/google/callback/`;
    const client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri,
    );
    const { tokens } = await client.getToken({
      code: params.get('code')!,
      codeVerifier: verifier,
      redirect_uri: redirectUri,
    });
    if (!tokens.id_token) throw new Error('Missing identity token');
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (
      !payload?.sub ||
      !payload.email ||
      !payload.email_verified ||
      payload.nonce !== nonce
    )
      throw new Error('Unverified Google identity');
    const user = {
      sub: payload.sub,
      email: payload.email.toLowerCase(),
      name: payload.name || payload.email,
    };
    await (await db()).collection('users').updateOne(
      { sub: user.sub },
      {
        $set: { ...user, lastSignInAt: new Date() },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true },
    );
    await audit(user.sub, 'sign_in');
    if (isAdminEmail(user.email)) {
      await issueSession(user, 'general');
      return NextResponse.redirect(new URL('/choose-role', req.url));
    }
    await issueSession(user, 'general');
    return NextResponse.redirect(new URL('/dashboard', req.url));
  } catch {
    return NextResponse.redirect(new URL('/?error=signin', req.url));
  } finally {
    (await cookies()).delete('tf_oauth');
  }
}
