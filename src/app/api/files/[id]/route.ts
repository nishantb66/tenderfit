import { authorizedFile } from '@/server/files';
import { requireSession } from '@/server/auth';
import { guardError } from '@/server/http';
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireSession();
    const { id } = await params;
    const buffer = await authorizedFile(id, user.sub, user.role);
    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': 'attachment; filename="source-document"',
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (e) {
    return guardError(e);
  }
}
