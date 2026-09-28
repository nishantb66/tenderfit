import { cookies } from 'next/headers';
import { createHash, randomBytes } from 'node:crypto';
import { db } from './db';
import { isAdminEmail } from '@/config/admin';
export type ActiveRole = 'general' | 'admin';
export type Session = {
  sub: string;
  email: string;
  name: string;
  role: ActiveRole;
  sessionHash: string;
};
const cookieName = 'tf_session';
export function hash(value: string) {
  return createHash('sha256').update(value).digest('hex');
}
export async function session(): Promise<Session | null> {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return null;
  const row = await (await db()).collection('sessions').findOne({
    tokenHash: hash(token),
    expiresAt: { $gt: new Date() },
    revokedAt: { $exists: false },
  });
  if (!row) return null;
  if (row.role === 'admin' && !isAdminEmail(row.email)) return null;
  return {
    sub: row.sub,
    email: row.email,
    name: row.name,
    role: row.role,
    sessionHash: row.tokenHash,
  };
}
export async function requireSession() {
  const value = await session();
  if (!value) throw new Error('Sign in required');
  return value;
}
export async function requireAdmin() {
  const value = await requireSession();
  if (value.role !== 'admin' || !isAdminEmail(value.email))
    throw new Error('Admin access required');
  return value;
}
export async function issueSession(
  user: { sub: string; email: string; name: string },
  role: ActiveRole,
) {
  if (role === 'admin' && !isAdminEmail(user.email))
    throw new Error('Admin access required');
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + 7 * 86400_000);
  await (await db()).collection('sessions').insertOne({
    tokenHash: hash(token),
    ...user,
    role,
    createdAt: new Date(),
    expiresAt,
  });
  (await cookies()).set(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
  return token;
}
export async function revokeSession() {
  const token = (await cookies()).get(cookieName)?.value;
  if (token)
    await (
      await db()
    )
      .collection('sessions')
      .updateOne(
        { tokenHash: hash(token) },
        { $set: { revokedAt: new Date() } },
      );
  (await cookies()).delete(cookieName);
}
export async function audit(
  actor: string,
  action: string,
  detail: Record<string, unknown> = {},
) {
  await (
    await db()
  )
    .collection('audit_events')
    .insertOne({ actor, action, detail, at: new Date() });
}
