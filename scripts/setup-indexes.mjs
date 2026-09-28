import { MongoClient } from 'mongodb';
if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
const client = new MongoClient(process.env.MONGODB_URI);
try {
  await client.connect();
  const db = client.db('tenderfit');
  await Promise.all([
    db.collection('users').createIndex({ sub: 1 }, { unique: true }),
    db
      .collection('sessions')
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db
      .collection('tenders')
      .createIndex({ organizationId: 1, ownerUserId: 1, createdAt: -1 }),
    db
      .collection('analyses')
      .createIndex({ tenderId: 1, revision: 1 }, { unique: true }),
    db
      .collection('kb_chunks')
      .createIndex({ organizationId: 1, kbVersion: 1, documentId: 1 }),
    db.collection('ai_usage').createIndex({ analysisId: 1, stage: 1 }),
    db
      .collection('rate_limits')
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
  ]);
  const collection = db.collection('kb_chunks');
  const existing = await collection.listSearchIndexes().toArray();
  if (!existing.some((x) => x.name === 'kb_vector_index'))
    await collection.createSearchIndex({
      name: 'kb_vector_index',
      type: 'vectorSearch',
      definition: {
        fields: [
          {
            type: 'vector',
            path: 'embedding',
            numDimensions: 1024,
            similarity: 'cosine',
          },
          { type: 'filter', path: 'organizationId' },
          { type: 'filter', path: 'kbVersion' },
        ],
      },
    });
  if (!existing.some((x) => x.name === 'kb_text_index'))
    await collection.createSearchIndex({
      name: 'kb_text_index',
      type: 'search',
      definition: {
        mappings: {
          dynamic: false,
          fields: {
            text: { type: 'string' },
            organizationId: { type: 'token' },
            kbVersion: { type: 'number' },
          },
        },
      },
    });
  console.log(
    'Database indexes requested. Wait for Atlas Search indexes to become queryable before building a KB.',
  );
} finally {
  await client.close();
}
