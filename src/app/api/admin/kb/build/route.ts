import { start } from 'workflow/api';
import { buildKnowledgeBase } from '@/server/jobs';
import { db } from '@/server/db';
import { requireAdmin, audit } from '@/server/auth';
import { sameOrigin, error, ok, guardError } from '@/server/http';
import { ORG_ID } from '@/config/pipeline';
export async function POST(req: Request) {
  if (!sameOrigin(req)) return error('Invalid origin', 403);
  try {
    const user = await requireAdmin();
    const d = await db();
    const docs = await d
      .collection('company_documents')
      .countDocuments({ organizationId: ORG_ID, status: { $ne: 'removed' } });
    if (!docs) return error('Add company documents before building');
    const org = await d
      .collection<{ _id: string; [key: string]: any }>('organizations')
      .findOne({ _id: ORG_ID });
    if (org?.maintenance)
      return error('A build is already running', 423, 'MAINTENANCE');
    const previousVersion = Number(org?.activeKbVersion || 0);
    const latest = await d
      .collection('kb_builds')
      .find({ organizationId: ORG_ID })
      .sort({ version: -1 })
      .limit(1)
      .next();
    const version = Math.max(previousVersion, Number(latest?.version || 0)) + 1;
    const build = await d.collection('kb_builds').insertOne({
      organizationId: ORG_ID,
      previousVersion,
      version,
      status: 'queued',
      progress: 0,
      createdAt: new Date(),
      startedBy: user.sub,
    });
    const buildId = String(build.insertedId);
    const lock = await d
      .collection<{ _id: string; [key: string]: any }>('organizations')
      .updateOne(
        {
          _id: ORG_ID,
          $or: [{ maintenance: null }, { maintenance: { $exists: false } }],
        },
        {
          $set: {
            maintenance: {
              buildId,
              progress: 'Starting Extract Engine',
              heartbeat: new Date(),
            },
            updatedAt: new Date(),
          },
          $setOnInsert: { activeKbVersion: previousVersion },
        },
        { upsert: !org },
      );
    if (!lock.modifiedCount && !lock.upsertedCount)
      return error('A build is already running', 423, 'MAINTENANCE');
    await audit(user.sub, 'kb_build_started', { buildId, version });
    try {
      const run = await start(buildKnowledgeBase, [buildId]);
      await d
        .collection('kb_builds')
        .updateOne(
          { _id: build.insertedId },
          { $set: { runId: run.runId, status: 'running' } },
        );
    } catch (e) {
      await d
        .collection<{ _id: string; [key: string]: any }>('organizations')
        .updateOne(
          { _id: ORG_ID, 'maintenance.buildId': buildId },
          { $set: { maintenance: null } },
        );
      throw e;
    }
    return ok({ buildId, version }, 202);
  } catch (e) {
    return guardError(e);
  }
}
