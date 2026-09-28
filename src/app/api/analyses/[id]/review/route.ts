import { db, oid } from '@/server/db';
import { requireAdmin, audit } from '@/server/auth';
import { sameOrigin, error, ok, guardError } from '@/server/http';
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!sameOrigin(req)) return error('Invalid origin', 403);
  try {
    const user = await requireAdmin();
    const { id } = await params;
    const { requirementId, reason } = await req.json();
    if (!reason || String(reason).trim().length < 5)
      return error('Review reason is required');
    const d = await db();
    const result = await d.collection('analyses').updateOne(
      { _id: oid(id), 'requirements.id': String(requirementId) },
      {
        $set: {
          'requirements.$.reviewed': {
            by: user.email,
            reason: String(reason).slice(0, 1000),
            at: new Date().toISOString(),
          },
        },
      },
    );
    if (!result.matchedCount) return error('Requirement not found', 404);
    await audit(user.sub, 'requirement_reviewed', {
      analysisId: id,
      requirementId,
    });
    return ok({ ok: true });
  } catch (e) {
    return guardError(e);
  }
}
