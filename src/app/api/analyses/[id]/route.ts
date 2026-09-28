import { db, oid } from '@/server/db';
import { requireSession } from '@/server/auth';
import { ok, error, guardError } from '@/server/http';
import { ORG_ID } from '@/config/pipeline';
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireSession();
    const { id } = await params;
    const filter = {
      _id: oid(id),
      organizationId: ORG_ID,
      ...(user.role === 'admin' ? {} : { ownerUserId: user.sub }),
    };
    const d = await db();
    const row = await d.collection('analyses').findOne(filter);
    if (!row) return error('Report not found', 404);
    const citations = [
      ...(await d
        .collection('tender_passages')
        .find({ analysisId: id })
        .project({
          text: 1,
          id: 1,
          page: 1,
          section: 1,
          filename: 1,
          fileId: 1,
        })
        .toArray()),
      ...(await d
        .collection('kb_chunks')
        .find({
          organizationId: ORG_ID,
          kbVersion: row.kbVersion,
          citationId: {
            $in: (row.requirements || []).flatMap(
              (r: { companyCitationIds?: string[] }) =>
                r.companyCitationIds || [],
            ),
          },
        })
        .project({
          text: 1,
          citationId: 1,
          page: 1,
          section: 1,
          filename: 1,
          sourceFileId: 1,
        })
        .toArray()),
    ].map((x) => ({ ...x, _id: undefined }));
    const usage = await d
      .collection('ai_usage')
      .aggregate([
        { $match: { analysisId: id } },
        {
          $group: {
            _id: '$model',
            promptTokens: { $sum: '$prompt_tokens' },
            completionTokens: { $sum: '$completion_tokens' },
            calls: { $sum: 1 },
          },
        },
      ])
      .toArray();
    return ok({ analysis: { ...row, _id: id }, citations, usage });
  } catch (e) {
    return guardError(e);
  }
}
