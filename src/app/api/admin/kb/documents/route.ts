import { db } from '@/server/db';
import { requireAdmin, audit } from '@/server/auth';
import { sameOrigin, error, ok, guardError } from '@/server/http';
import { saveFile } from '@/server/files';
import { ORG_ID } from '@/config/pipeline';
import { rateLimit } from '@/server/rate-limit';
export async function GET() {
  try {
    await requireAdmin();
    const rows = await (
      await db()
    )
      .collection('company_documents')
      .find({ organizationId: ORG_ID, status: { $ne: 'removed' } })
      .sort({ createdAt: -1 })
      .project({ storageId: 0 })
      .toArray();
    return ok({ documents: rows.map((r) => ({ ...r, _id: String(r._id) })) });
  } catch (e) {
    return guardError(e);
  }
}
export async function POST(req: Request) {
  if (!sameOrigin(req)) return error('Invalid origin', 403);
  try {
    const user = await requireAdmin();
    await rateLimit('kb-upload', user.sub, 20, 3600_000);
    const d = await db();
    const org = await d
      .collection<{ _id: string; [key: string]: any }>('organizations')
      .findOne({ _id: ORG_ID });
    if (org?.maintenance)
      return error('Knowledge base is being rebuilt', 423, 'MAINTENANCE');
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return error('Select a PDF or DOCX');
    const saved = await saveFile(file, user.sub, ORG_ID);
    const row = {
      ...saved,
      organizationId: ORG_ID,
      ownerUserId: user.sub,
      typeLabel: String(form.get('type') || 'Company evidence').slice(0, 80),
      status: 'draft',
      createdAt: new Date(),
    };
    const result = await d.collection('company_documents').insertOne(row);
    await d.collection('file_access').insertOne({
      storageId: saved.storageId,
      ownerUserId: user.sub,
      adminReadable: true,
      organizationId: ORG_ID,
    });
    await audit(user.sub, 'kb_document_added', {
      documentId: String(result.insertedId),
    });
    return ok({ id: String(result.insertedId) }, 201);
  } catch (e) {
    return guardError(e);
  }
}
