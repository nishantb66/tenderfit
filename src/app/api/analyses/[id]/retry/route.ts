import { start } from 'workflow/api';
import { retryAnalysisErrors } from '@/server/jobs';
import { db, oid } from '@/server/db';
import { requireSession } from '@/server/auth';
import { sameOrigin, error, ok, guardError } from '@/server/http';
import { ORG_ID } from '@/config/pipeline';
import { rateLimit } from '@/server/rate-limit';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!sameOrigin(req)) return error('Invalid origin', 403);
  try {
    const user = await requireSession();
    const { id } = await params;
    const d = await db();
    const filter = {
      _id: oid(id),
      organizationId: ORG_ID,
      ownerUserId: user.sub,
      status: 'complete',
      $or: [
        { 'requirements.status': 'analysis_error' },
        { requirements: { $size: 0 } },
      ],
    };
    const claimed = await d.collection('analyses').findOneAndUpdate(
      filter,
      { $set: { status: 'comparing', progress: 45 }, $unset: { completedAt: '' } },
      { returnDocument: 'before' },
    );
    if (!claimed) return error('No empty or failed analysis to retry', 409);
    try {
      await rateLimit('analysis-retry', user.sub, 5, 3600_000);
      const run = await start(retryAnalysisErrors, [id]);
      await d.collection('analyses').updateOne(
        { _id: oid(id) },
        { $set: { runId: run.runId } },
      );
    } catch (e) {
      await d.collection('analyses').updateOne(
        { _id: oid(id) },
        { $set: { status: 'complete', progress: 100, completedAt: new Date() } },
      );
      throw e;
    }
    return ok({ analysisId: id }, 202);
  } catch (e) {
    return guardError(e);
  }
}
