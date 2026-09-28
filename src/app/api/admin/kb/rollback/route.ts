import { db } from '@/server/db';
import { requireAdmin, audit } from '@/server/auth';
import { sameOrigin, error, ok, guardError } from '@/server/http';
import { ORG_ID } from '@/config/pipeline';
export async function POST(req: Request) {
  if (!sameOrigin(req)) return error('Invalid origin', 403);
  try {
    const user = await requireAdmin();
    const { version } = await req.json();
    const d = await db();
    const published = await d.collection('kb_builds').findOne({
      organizationId: ORG_ID,
      version: Number(version),
      status: 'published',
    });
    if (!published) return error('Published version not found', 404);
    const result = await d
      .collection<{ _id: string; [key: string]: any }>('organizations')
      .updateOne(
        { _id: ORG_ID, maintenance: null },
        { $set: { activeKbVersion: Number(version), updatedAt: new Date() } },
      );
    if (!result.matchedCount) return error('Maintenance in progress', 423);
    await audit(user.sub, 'kb_rollback', { version });
    return ok({ version });
  } catch (e) {
    return guardError(e);
  }
}
