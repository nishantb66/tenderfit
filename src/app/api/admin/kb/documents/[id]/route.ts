import { db, oid } from '@/server/db';
import { requireAdmin, audit } from '@/server/auth';
import { sameOrigin, error, ok, guardError } from '@/server/http';
import { ORG_ID } from '@/config/pipeline';
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!sameOrigin(req)) return error('Invalid origin', 403);
  try {
    const user = await requireAdmin();
    const d = await db();
    const org = await d
      .collection<{ _id: string; [key: string]: any }>('organizations')
      .findOne({ _id: ORG_ID });
    if (org?.maintenance)
      return error('Knowledge base is being rebuilt', 423, 'MAINTENANCE');
    const { id } = await params;
    const result = await d
      .collection('company_documents')
      .updateOne(
        { _id: oid(id), organizationId: ORG_ID },
        { $set: { status: 'removed', removedAt: new Date() } },
      );
    if (!result.matchedCount) return error('Document not found', 404);
    await audit(user.sub, 'kb_document_removed', { documentId: id });
    return ok({ ok: true });
  } catch (e) {
    return guardError(e);
  }
}
