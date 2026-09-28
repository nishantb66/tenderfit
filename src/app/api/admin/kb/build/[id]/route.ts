import { db, oid } from '@/server/db';
import { requireAdmin } from '@/server/auth';
import { ok, guardError } from '@/server/http';
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const row = await (
      await db()
    )
      .collection('kb_builds')
      .findOne({ _id: oid(id) });
    return ok({ build: row ? { ...row, _id: id } : null });
  } catch (e) {
    return guardError(e);
  }
}
