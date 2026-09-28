import { db } from './db';
import { createHash } from 'node:crypto';
export async function rateLimit(
  scope: string,
  subject: string,
  limit: number,
  windowMs: number,
) {
  const d = await db();
  const bucket = Math.floor(Date.now() / windowMs);
  const key = createHash('sha256')
    .update(`${scope}:${subject}:${bucket}`)
    .digest('hex');
  const result = await d
    .collection<{ _id: string; count: number; expiresAt: Date }>('rate_limits')
    .findOneAndUpdate(
      { _id: key },
      {
        $inc: { count: 1 },
        $setOnInsert: { expiresAt: new Date((bucket + 2) * windowMs) },
      },
      { upsert: true, returnDocument: 'after' },
    );
  if ((result?.count || 0) > limit)
    throw new Error('Rate limit exceeded. Try again shortly.');
}
