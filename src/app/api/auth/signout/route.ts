import { revokeSession } from '@/server/auth';
import { sameOrigin, error, ok } from '@/server/http';
export async function POST(req: Request) {
  if (!sameOrigin(req)) return error('Invalid origin', 403);
  await revokeSession();
  return ok({ ok: true });
}
