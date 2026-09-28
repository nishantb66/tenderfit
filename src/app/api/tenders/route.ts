import { db } from '@/server/db';
import { requireSession } from '@/server/auth';
import { sameOrigin, error, ok, guardError } from '@/server/http';
import { saveFile } from '@/server/files';
import { rateLimit } from '@/server/rate-limit';
import { ORG_ID, MAX_FILES, MAX_TOTAL_UPLOAD_BYTES } from '@/config/pipeline';
export async function GET() {
  try {
    const user = await requireSession();
    const rows = await (
      await db()
    )
      .collection('tenders')
      .find({ organizationId: ORG_ID, ownerUserId: user.sub })
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();
    return ok({ tenders: rows.map((r) => ({ ...r, _id: String(r._id) })) });
  } catch (e) {
    return guardError(e);
  }
}
export async function POST(req: Request) {
  if (!sameOrigin(req)) return error('Invalid origin', 403);
  try {
    const user = await requireSession();
    if (user.role !== 'general')
      return error('Switch to General User to submit tenders', 403);
    await rateLimit('tender-upload', user.sub, 10, 3600_000);
    const d = await db();
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
    const form = await req.formData();
    const files = form
      .getAll('files')
      .filter((x) => x instanceof File) as File[];
    if (!files.length || files.length > MAX_FILES)
      return error(`Upload 1 to ${MAX_FILES} files`);
    if (files.reduce((n, f) => n + f.size, 0) > MAX_TOTAL_UPLOAD_BYTES)
      return error('Combined file size must be 3.5 MB or less');
    const title = String(form.get('title') || '')
      .trim()
      .slice(0, 160);
    if (!title) return error('Tender name is required');
    const saved = [];
    for (const file of files)
      saved.push(await saveFile(file, user.sub, ORG_ID));
    const tender = await d.collection('tenders').insertOne({
      organizationId: ORG_ID,
      ownerUserId: user.sub,
      ownerEmail: user.email,
      title,
      context: String(form.get('context') || '').slice(0, 3000),
      closingDate: String(form.get('closingDate') || ''),
      industry: String(form.get('industry') || '').slice(0, 120),
      tenderUrl: String(form.get('tenderUrl') || '').slice(0, 1000),
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    for (const [i, file] of saved.entries()) {
      await d.collection('tender_documents').insertOne({
        ...file,
        organizationId: ORG_ID,
        tenderId: String(tender.insertedId),
        ownerUserId: user.sub,
        priority: i,
        kind: i === 0 ? 'main' : 'annexure',
        createdAt: new Date(),
      });
      await d.collection('file_access').insertOne({
        storageId: file.storageId,
        ownerUserId: user.sub,
        adminReadable: true,
        organizationId: ORG_ID,
      });
    }
    return ok(
      {
        id: String(tender.insertedId),
        title,
        files: saved.map((x) => ({ filename: x.filename, size: x.size })),
      },
      201,
    );
  } catch (e) {
    return guardError(e);
  }
}
