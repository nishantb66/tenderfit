import { db } from '@/server/db';
import { session } from '@/server/auth';
import { ORG_ID } from '@/config/pipeline';
import { ok } from '@/server/http';
export async function GET() {
  const user = await session();
  if (!user) return ok({ signedIn: false });
  try {
    const d = await db();
    let org = await d
      .collection<{ _id: string; [key: string]: any }>('organizations')
      .findOne({ _id: ORG_ID });
    if (
      org?.maintenance?.heartbeat &&
      Date.now() - new Date(org.maintenance.heartbeat).getTime() >
        60 * 60 * 1000
    ) {
      const buildId = org.maintenance.buildId;
      await d
        .collection<{ _id: string; [key: string]: any }>('organizations')
        .updateOne(
          { _id: ORG_ID, 'maintenance.buildId': buildId },
          {
            $set: {
              maintenance: null,
              lastBuildError:
                'Build lease expired; last published version remains active',
            },
          },
        );
      org = await d
        .collection<{ _id: string; [key: string]: any }>('organizations')
        .findOne({ _id: ORG_ID });
    }
    return ok({
      signedIn: true,
      user: { name: user.name, email: user.email, role: user.role },
      activeKbVersion: org?.activeKbVersion || 0,
      maintenance: org?.maintenance || null,
      lastBuildError: org?.lastBuildError || null,
      ready: {
        database: true,
        groq: Boolean(process.env.GROQ_API_KEY),
        embeddings: Boolean(process.env.VOYAGE_API_KEY),
      },
    });
  } catch {
    return ok({
      signedIn: true,
      ready: {
        database: false,
        groq: Boolean(process.env.GROQ_API_KEY),
        embeddings: Boolean(process.env.VOYAGE_API_KEY),
      },
    });
  }
}
