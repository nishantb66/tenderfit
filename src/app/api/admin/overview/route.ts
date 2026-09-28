import { db } from '@/server/db';
import { requireAdmin } from '@/server/auth';
import { ok, guardError } from '@/server/http';
import { ORG_ID } from '@/config/pipeline';

export async function GET() {
  try {
    await requireAdmin();
    const d = await db();
    const [builds, analyses, usage, perAnalysis, documents] = await Promise.all(
      [
        d
          .collection('kb_builds')
          .find({ organizationId: ORG_ID })
          .sort({ createdAt: -1 })
          .limit(12)
          .toArray(),
        d
          .collection('analyses')
          .find({ organizationId: ORG_ID })
          .sort({ createdAt: -1 })
          .limit(100)
          .toArray(),
        d
          .collection('ai_usage')
          .aggregate([
            {
              $group: {
                _id: '$model',
                inputTokens: { $sum: '$prompt_tokens' },
                outputTokens: { $sum: '$completion_tokens' },
                calls: { $sum: 1 },
              },
            },
          ])
          .toArray(),
        d
          .collection('ai_usage')
          .aggregate([
            { $match: { analysisId: { $type: 'string' } } },
            {
              $group: {
                _id: '$analysisId',
                totalTokens: { $sum: '$total_tokens' },
                calls: { $sum: 1 },
              },
            },
          ])
          .toArray(),
        d.collection('company_documents').countDocuments({
          organizationId: ORG_ID,
          status: { $ne: 'removed' },
        }),
      ],
    );
    const totals = new Map(
      perAnalysis.map((x) => [
        String(x._id),
        { tokens: Number(x.totalTokens || 0), calls: Number(x.calls || 0) },
      ]),
    );
    return ok({
      builds: builds.map((x) => ({ ...x, _id: String(x._id) })),
      analyses: analyses.map((x) => ({
        id: String(x._id),
        tenderId: x.tenderId,
        title: x.title,
        ownerEmail: x.ownerEmail,
        status: x.status,
        decision: x.decision,
        kbVersion: x.kbVersion,
        model: x.model,
        createdAt: x.createdAt,
        usage: totals.get(String(x._id)) || { tokens: 0, calls: 0 },
      })),
      usage,
      documents,
    });
  } catch (e) {
    return guardError(e);
  }
}
