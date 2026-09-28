import { MongoClient, ObjectId, GridFSBucket } from 'mongodb';
let clientPromise: Promise<MongoClient> | undefined;
export async function db() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
  clientPromise ??= new MongoClient(process.env.MONGODB_URI, {
    maxPoolSize: 10,
  })
    .connect()
    .catch((error) => {
      clientPromise = undefined;
      throw error;
    });
  return (await clientPromise).db('tenderfit');
}
export async function bucket() {
  return new GridFSBucket(await db(), { bucketName: 'private_files' });
}
export function oid(id: string) {
  if (!ObjectId.isValid(id)) throw new Error('Invalid ID');
  return new ObjectId(id);
}
export async function ensureIndexes() {
  const d = await db();
  await Promise.all([
    d.collection('users').createIndex({ sub: 1 }, { unique: true }),
    d
      .collection('sessions')
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    d
      .collection('tenders')
      .createIndex({ organizationId: 1, ownerUserId: 1, createdAt: -1 }),
    d
      .collection('analyses')
      .createIndex({ tenderId: 1, revision: 1 }, { unique: true }),
    d
      .collection('kb_chunks')
      .createIndex({ organizationId: 1, kbVersion: 1, documentId: 1 }),
    d.collection('ai_usage').createIndex({ analysisId: 1, stage: 1 }),
  ]);
}
