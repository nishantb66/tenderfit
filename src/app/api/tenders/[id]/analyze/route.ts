import { start } from 'workflow/api';
import { analyzeTender } from '@/server/jobs';
import { db, oid } from '@/server/db';
import { requireSession } from '@/server/auth';
import { sameOrigin, error, ok, guardError } from '@/server/http';
import { ORG_ID } from '@/config/pipeline';
import { DEFAULT_MODEL } from '@/config/models';
import { rateLimit } from '@/server/rate-limit';
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!sameOrigin(req)) return error('Invalid origin', 403);
  try {
    const user = await requireSession();
    if (user.role !== 'general') return error('Switch to General User', 403);
    await rateLimit('analysis', user.sub, 5, 3600_000);
    const { id } = await params;
    const d = await db();
    const tender = await d
      .collection('tenders')
      .findOne({ _id: oid(id), organizationId: ORG_ID, ownerUserId: user.sub });
    if (!tender) return error('Tender not found', 404);
    if (tender.status !== 'draft')
      return error('Analysis already started', 409);
    const org = await d
      .collection<{ _id: string; [key: string]: any }>('organizations')
      .findOne({ _id: ORG_ID });
    if (org?.maintenance)
      return error('Knowledge base is being rebuilt', 423, 'MAINTENANCE');
    if (!org?.activeKbVersion)
      return error(
        'Knowledge base has not been published',
        503,
        'SETUP_REQUIRED',
      );
    if (!process.env.VOYAGE_API_KEY || !process.env.GROQ_API_KEY)
      return error('AI services are not configured', 503, 'SETUP_REQUIRED');
    const kbBuild = await d.collection('kb_builds').findOne({
      organizationId: ORG_ID,
      version: org.activeKbVersion,
      status: 'published',
    });
    const setting = await d
      .collection<{ _id: string; [key: string]: any }>('settings')
      .findOne({ _id: 'ai' });
    const model = String(setting?.model || DEFAULT_MODEL);
    const inserted = await d.collection('analyses').insertOne({
      organizationId: ORG_ID,
      tenderId: id,
      ownerUserId: user.sub,
      ownerEmail: user.email,
      title: tender.title,
      revision: 1,
      kbVersion: org.activeKbVersion,
      model,
      status: 'queued',
      progress: 0,
      requirements: [],
      kbWarnings: kbBuild?.warnings || [],
      createdAt: new Date(),
    });
    const analysisId = String(inserted.insertedId);
    await d
      .collection('tender_documents')
      .updateMany({ tenderId: id }, { $set: { analysisId } });
    await d
      .collection('tenders')
      .updateOne(
        { _id: tender._id },
        { $set: { status: 'analyzing', analysisId, updatedAt: new Date() } },
      );
    try {
      const run = await start(analyzeTender, [analysisId]);
      await d
        .collection('analyses')
        .updateOne(
          { _id: inserted.insertedId },
          { $set: { runId: run.runId, status: 'parsing' } },
        );
    } catch (e) {
      await d
        .collection('analyses')
        .updateOne(
          { _id: inserted.insertedId },
          { $set: { status: 'failed', error: 'Workflow unavailable' } },
        );
      throw e;
    }
    return ok({ analysisId }, 202);
  } catch (e) {
    return guardError(e);
  }
}
