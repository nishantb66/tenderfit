import { db } from './db';
import { embedQuery } from './ai';
import { ORG_ID } from '@/config/pipeline';
export type Candidate = {
  citationId: string;
  documentId: string;
  filename: string;
  page: number;
  section: string;
  text: string;
  score: number;
};
export async function retrieve(
  query: string,
  kbVersion: number,
): Promise<Candidate[]> {
  const d = await db();
  const vector = await embedQuery(query);
  const filter = { organizationId: ORG_ID, kbVersion };
  const [semantic, lexical] = await Promise.all([
    d
      .collection('kb_chunks')
      .aggregate([
        {
          $vectorSearch: {
            index: 'kb_vector_index',
            path: 'embedding',
            queryVector: vector,
            numCandidates: 80,
            limit: 12,
            filter,
          },
        },
        { $project: { embedding: 0, score: { $meta: 'vectorSearchScore' } } },
      ])
      .toArray(),
    d
      .collection('kb_chunks')
      .aggregate([
        {
          $search: {
            index: 'kb_text_index',
            compound: {
              must: [{ text: { query, path: 'text' } }],
              filter: [
                { equals: { path: 'organizationId', value: ORG_ID } },
                { equals: { path: 'kbVersion', value: kbVersion } },
              ],
            },
          },
        },
        { $limit: 12 },
        { $project: { embedding: 0, score: { $meta: 'searchScore' } } },
      ])
      .toArray(),
  ]);
  const ranks = new Map<string, Candidate>();
  for (const [list, weight] of [
    [semantic, 1],
    [lexical, 1],
  ] as const)
    list.forEach((row, i) => {
      const key = String(row.citationId);
      const existing = ranks.get(key);
      const score = (existing?.score || 0) + weight / (60 + i + 1);
      ranks.set(key, {
        citationId: key,
        documentId: String(row.documentId),
        filename: String(row.filename),
        page: Number(row.page),
        section: String(row.section),
        text: String(row.text),
        score,
      });
    });
  const terms = new Set(query.toLowerCase().match(/[a-z0-9]{4,}/g) || []);
  const cards = await d
    .collection('evidence_cards')
    .find(filter)
    .limit(500)
    .toArray();
  const matched = cards
    .map((card) => ({
      card,
      score: (
        String(card.factType) +
        ' ' +
        String(card.value) +
        ' ' +
        String(card.period || '')
      )
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((word: string) => terms.has(word)).length,
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
  if (matched.length) {
    const ids = matched.map((x) => x.card.citationId);
    const source = await d
      .collection('kb_chunks')
      .find(
        { ...filter, citationId: { $in: ids } },
        { projection: { embedding: 0 } },
      )
      .toArray();
    for (const row of source) {
      const key = String(row.citationId),
        existing = ranks.get(key);
      ranks.set(key, {
        citationId: key,
        documentId: String(row.documentId),
        filename: String(row.filename),
        page: Number(row.page),
        section: String(row.section),
        text: String(row.text),
        score: (existing?.score || 0) + 0.03,
      });
    }
  }
  return [...ranks.values()].sort((a, b) => b.score - a.score).slice(0, 8);
}
