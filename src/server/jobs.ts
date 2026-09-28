import { db, oid } from './db';
import { parseFile } from './files';
import { embed, groqJson } from './ai';
import { retrieve } from './retrieval';
import {
  numericGuard,
  validateComparison,
  verdict,
  type Requirement,
} from './verdict';
import { ORG_ID, EMBEDDING_MODEL, PARSER_VERSION } from '@/config/pipeline';
import { createHash } from 'node:crypto';
type ExtractedRequirement = {
  text: string;
  category: string;
  mandatory: boolean;
  tenderCitationIds: string[];
  documentRequested?: string;
  dueDate?: string;
};
function chunks(text: string, max = 1100) {
  const sentences = text.match(/[^.!?\n]+[.!?]?|[^\n]+/g) || [text];
  const parts: string[] = [];
  let current = '';
  for (const sentence of sentences) {
    const value = sentence.trim();
    if (!value) continue;
    if (current.length + value.length + 1 > max && current) {
      parts.push(current);
      current = '';
    }
    if (value.length > max) {
      for (let i = 0; i < value.length; i += max) {
        const slice = value.slice(i, i + max);
        if (slice.trim().length > 20) parts.push(slice);
      }
    } else current += `${current ? ' ' : ''}${value}`;
  }
  if (current) parts.push(current);
  return parts;
}
export async function buildKnowledgeBase(buildId: string) {
  'use workflow';
  try {
    const ids = await prepareKb(buildId);
    for (const [index, documentId] of ids.entries())
      await indexDocument(buildId, documentId, index, ids.length);
    await validateKb(buildId);
    await publishKb(buildId);
  } catch (e) {
    await failKb(buildId, e instanceof Error ? e.message : 'Build failed');
    throw e;
  }
}
async function prepareKb(buildId: string) {
  'use step';
  const d = await db();
  const build = await d.collection('kb_builds').findOne({ _id: oid(buildId) });
  if (!build) throw new Error('Build missing');
  const docs = await d
    .collection('company_documents')
    .find({ organizationId: ORG_ID, status: { $ne: 'removed' } })
    .project({ _id: 1 })
    .toArray();
  if (!docs.length) throw new Error('Add a company document before building');
  const version = build.version as number;
  await Promise.all([
    d
      .collection('kb_chunks')
      .deleteMany({ organizationId: ORG_ID, kbVersion: version }),
    d
      .collection('evidence_cards')
      .deleteMany({ organizationId: ORG_ID, kbVersion: version }),
  ]);
  return docs.map((x) => String(x._id));
}
async function indexDocument(
  buildId: string,
  documentId: string,
  index: number,
  total: number,
) {
  'use step';
  const d = await db();
  const [build, doc] = await Promise.all([
    d.collection('kb_builds').findOne({ _id: oid(buildId) }),
    d
      .collection('company_documents')
      .findOne({
        _id: oid(documentId),
        organizationId: ORG_ID,
        status: { $ne: 'removed' },
      }),
  ]);
  if (!build || !doc) throw new Error('Build source missing');
  const version = build.version as number;
  await d
    .collection<{ _id: string; [key: string]: any }>('organizations')
    .updateOne(
      { _id: ORG_ID },
      {
        $set: {
          'maintenance.progress': `Preparing ${index + 1}/${total} documents`,
          'maintenance.heartbeat': new Date(),
        },
      },
    );
  await Promise.all([
    d
      .collection('kb_chunks')
      .deleteMany({ organizationId: ORG_ID, kbVersion: version, documentId }),
    d
      .collection('evidence_cards')
      .deleteMany({ organizationId: ORG_ID, kbVersion: version, documentId }),
  ]);
  const parsed = await parseFile(doc.storageId, doc.filename);
  const documentWarnings = parsed.warnings.map((w) => `${doc.filename}: ${w}`);
  if (!parsed.passages.some((p) => p.text.trim().length > 30))
    throw new Error(
      `${doc.filename} has no readable text; OCR is not configured`,
    );
  const rows = parsed.passages.flatMap((p) =>
    chunks(p.text).map((text, j) => ({
      organizationId: ORG_ID,
      kbVersion: version,
      documentId,
      filename: doc.filename,
      sourceFileId: doc.storageId,
      fileHash: doc.sha256,
      page: p.page,
      section: p.section,
      citationId: createHash('sha256')
        .update(`${doc.sha256}:${p.page}:${j}:${PARSER_VERSION}`)
        .digest('hex'),
      excerptHash: createHash('sha256').update(text).digest('hex'),
      text,
      parserVersion: PARSER_VERSION,
      embeddingModel: EMBEDDING_MODEL,
    })),
  );
  const vectors = await embed(rows.map((r) => r.text));
  if (rows.length)
    await d
      .collection('kb_chunks')
      .insertMany(rows.map((r, j) => ({ ...r, embedding: vectors[j] })));
  for (let j = 0; j < rows.length; j += 8) {
    const batch = rows.slice(j, j + 8);
    const cards = await groqJson<{
      cards?: {
        factType: string;
        value: string;
        period?: string;
        validUntil?: string;
        citationId: string;
        sourceAuthority?: string;
      }[];
    }>({
      kbBuildId: buildId,
      stage: 'evidence_cards',
      schemaHint:
        '{"cards":[{"factType":"turnover|certification|project|incorporation|employees|capability|other","value":"exact source fact","period":"optional","validUntil":"optional ISO date","citationId":"provided ID","sourceAuthority":"optional"}]}',
      prompt: `Extract only concrete, tender-relevant company facts directly stated in these passages. Do not infer credentials, customers, turnover or headcount from marketing copy. Return an empty array if none. PASSAGES:\n${JSON.stringify(batch.map((x) => ({ citationId: x.citationId, text: x.text.slice(0, 1000) })))}`,
    });
    const allowed = new Set(batch.map((x) => x.citationId));
    const valid = (cards.cards || [])
      .filter((x) => allowed.has(x.citationId) && x.value && x.factType)
      .slice(0, 50);
    if (valid.length)
      await d
        .collection('evidence_cards')
        .insertMany(
          valid.map((x) => ({
            ...x,
            organizationId: ORG_ID,
            kbVersion: version,
            documentId,
            filename: doc.filename,
          })),
        );
  }
  const prior = ((build.warnings as string[]) || []).filter(
    (w) => !w.startsWith(`${doc.filename}:`),
  );
  await d
    .collection('kb_builds')
    .updateOne(
      { _id: build._id },
      {
        $set: {
          progress: Math.round(((index + 1) / total) * 85),
          warnings: [...prior, ...documentWarnings],
        },
      },
    );
}
async function validateKb(buildId: string) {
  'use step';
  const d = await db();
  const build = await d.collection('kb_builds').findOne({ _id: oid(buildId) });
  if (!build) throw new Error('Build missing');
  const version = build.version as number;
  await d
    .collection('kb_builds')
    .updateOne(
      { _id: build._id },
      { $set: { progress: 90, status: 'validating' } },
    );
  const count = await d
    .collection('kb_chunks')
    .countDocuments({ organizationId: ORG_ID, kbVersion: version });
  if (!count) throw new Error('No indexable evidence was produced');
  const sample = await d
    .collection('kb_chunks')
    .findOne({ organizationId: ORG_ID, kbVersion: version });
  if (
    !sample ||
    !Array.isArray(sample.embedding) ||
    sample.embedding.length !== 1024
  )
    throw new Error('Embedding validation failed');
  if (
    !(await retrieve(String(sample.text).slice(0, 120), version)).some(
      (c) => c.citationId === sample.citationId,
    )
  )
    throw new Error('Hybrid index probe failed. Check Atlas Search indexes.');
}
async function publishKb(buildId: string) {
  'use step';
  const d = await db();
  const build = await d.collection('kb_builds').findOne({ _id: oid(buildId) });
  if (!build) throw new Error('Build missing');
  const updated = await d
    .collection<{ _id: string; [key: string]: any }>('organizations')
    .updateOne(
      {
        _id: ORG_ID,
        'maintenance.buildId': buildId,
        activeKbVersion: build.previousVersion,
      },
      {
        $set: {
          activeKbVersion: build.version,
          maintenance: null,
          lastBuildError: null,
          updatedAt: new Date(),
        },
      },
    );
  if (!updated.modifiedCount) throw new Error('KB publication conflict');
  await d
    .collection('kb_builds')
    .updateOne(
      { _id: build._id },
      { $set: { status: 'published', progress: 100, publishedAt: new Date() } },
    );
  await d
    .collection('company_documents')
    .updateMany(
      { organizationId: ORG_ID, status: 'draft' },
      { $set: { status: 'published' } },
    );
}
async function failKb(buildId: string, message: string) {
  'use step';
  const d = await db();
  await d
    .collection('kb_builds')
    .updateOne(
      { _id: oid(buildId) },
      { $set: { status: 'failed', error: message, finishedAt: new Date() } },
    );
  await d
    .collection<{ _id: string; [key: string]: any }>('organizations')
    .updateOne(
      { _id: ORG_ID, 'maintenance.buildId': buildId },
      { $set: { maintenance: null, lastBuildError: message } },
    );
}
export async function analyzeTender(analysisId: string) {
  'use workflow';
  try {
    const passages = await parseTenderDocuments(analysisId);
    for (const passageId of passages)
      await extractTenderPassage(analysisId, passageId);
    const requirements = await normalizeRequirements(analysisId);
    for (const requirementId of requirements)
      await compareOne(analysisId, requirementId);
    await finishAnalysis(analysisId);
  } catch (e) {
    await failAnalysis(
      analysisId,
      e instanceof Error ? e.message : 'Analysis failed',
    );
    throw e;
  }
}
export async function retryAnalysisErrors(analysisId: string) {
  'use workflow';
  try {
    const failed = await failedRequirementIds(analysisId);
    for (const requirementId of failed)
      await compareOne(analysisId, requirementId);
    await finishAnalysis(analysisId);
  } catch (e) {
    await failRetry(
      analysisId,
      e instanceof Error ? e.message : 'Retry failed',
    );
    throw e;
  }
}
async function failRetry(analysisId: string, message: string) {
  'use step';
  const d = await db();
  await d.collection('analyses').updateOne(
    { _id: oid(analysisId) },
    { $set: { status: 'complete', progress: 100, lastRetryError: message, completedAt: new Date() } },
  );
}
async function failedRequirementIds(analysisId: string) {
  'use step';
  const d = await db();
  const analysis = await d.collection('analyses').findOne({ _id: oid(analysisId) });
  if (!analysis) throw new Error('Analysis missing');
  return (analysis.requirements as Requirement[])
    .filter((r) => r.status === 'analysis_error')
    .map((r) => r.id);
}
async function parseTenderDocuments(analysisId: string) {
  'use step';
  const d = await db();
  const analysis = await d
    .collection('analyses')
    .findOne({ _id: oid(analysisId) });
  if (!analysis) throw new Error('Analysis missing');
  const docs = await d
    .collection('tender_documents')
    .find({ analysisId })
    .sort({ priority: 1 })
    .toArray();
  const coverage: string[] = [];
  const passageIds: string[] = [];
  for (const doc of docs) {
    const parsed = await parseFile(doc.storageId, doc.filename);
    coverage.push(...parsed.warnings.map((w) => `${doc.filename}: ${w}`));
    for (const passage of parsed.passages) {
      await d.collection('tender_passages').updateOne(
        { analysisId, id: passage.id },
        {
          $setOnInsert: {
            ...passage,
            analysisId,
            filename: doc.filename,
            fileId: doc.storageId,
            fileHash: doc.sha256,
          },
        },
        { upsert: true },
      );
      if (passage.text.trim().length >= 25) passageIds.push(passage.id);
    }
  }
  await d.collection('analyses').updateOne(
    { _id: analysis._id },
    {
      $set: {
        coverageWarnings: coverage,
        status: 'extracting',
        progress: 20,
      },
    },
  );
  return passageIds;
}
async function extractTenderPassage(analysisId: string, passageId: string) {
  'use step';
  const d = await db();
  const [analysis, passage] = await Promise.all([
    d.collection('analyses').findOne({ _id: oid(analysisId) }),
    d.collection('tender_passages').findOne({ analysisId, id: passageId }),
  ]);
  if (!analysis || !passage) throw new Error('Tender passage missing');
  const raw = await groqJson<{ requirements?: ExtractedRequirement[] }>({
    analysisId,
    stage: 'extract',
    model: analysis.model,
    schemaHint:
      '{"requirements":[{"text":"...","category":"eligibility|technical|commercial|submission|date|other","mandatory":true,"tenderCitationIds":["given citation ID"],"documentRequested":"optional","dueDate":"optional ISO date"}]}',
    prompt: `Document: ${passage.filename}; page/anchor: ${passage.section}; citation ID: ${passage.id}. Extract every atomic eligibility, technical, commercial and submission requirement. Only use this citation ID. TEXT:\n${String(passage.text).slice(0, 14000)}`,
  });
  const valid = (raw.requirements || []).filter(
    (r) => r.text && r.tenderCitationIds?.includes(passageId),
  );
  await d
    .collection('extracted_requirements')
    .updateOne(
      { analysisId, passageId },
      { $set: { requirements: valid } },
      { upsert: true },
    );
}
async function normalizeRequirements(analysisId: string) {
  'use step';
  const d = await db();
  const rows = await d
    .collection('extracted_requirements')
    .find({ analysisId })
    .toArray();
  const unique = new Map<string, ExtractedRequirement>();
  for (const row of rows)
    for (const r of row.requirements as ExtractedRequirement[])
      unique.set(r.text.trim().toLowerCase(), r);
  const requirements = [...unique.values()].map((r, i) => ({
    ...r,
    id: `req_${String(i + 1).padStart(3, '0')}`,
    status: 'needs_verification',
    companyCitationIds: [],
    reason: 'Awaiting evidence comparison',
    gaps: [],
    needsHumanReview: false,
  }));
  await d
    .collection('analyses')
    .updateOne(
      { _id: oid(analysisId) },
      { $set: { requirements, status: 'comparing', progress: 45 } },
    );
  return requirements.map((r) => r.id);
}
async function compareOne(analysisId: string, requirementId: string) {
  'use step';
  const d = await db();
  const analysis = await d
    .collection('analyses')
    .findOne({ _id: oid(analysisId) });
  if (!analysis) throw new Error('Analysis missing');
  const r = (analysis.requirements as Requirement[]).find(
    (x) => x.id === requirementId,
  );
  if (!r) throw new Error('Requirement missing');
  const tenderIds = new Set(
    (
      await d
        .collection('tender_passages')
        .find({ analysisId })
        .project({ id: 1 })
        .toArray()
    ).map((p) => String(p.id)),
  );
  let next: Requirement;
  try {
    const candidates = await retrieve(r.text, analysis.kbVersion);
    const raw = await groqJson<
      Partial<Requirement> & {
        actualValue?: number | null;
        requiredValue?: number | null;
        unit?: string | null;
      }
    >({
      analysisId,
      stage: 'compare',
      model: analysis.model,
      schemaHint:
        '{"status":"satisfied|not_satisfied|needs_verification|not_applicable|analysis_error","reason":"...","companyCitationIds":["IDs from evidence"],"tenderCitationIds":["given IDs"],"gaps":[],"needsHumanReview":false,"actualValue":null,"requiredValue":null,"unit":null}',
      prompt: `Requirement: ${r.text}\nMandatory: ${r.mandatory}\nTender citations: ${JSON.stringify(r.tenderCitationIds)}\nCompany evidence candidates: ${JSON.stringify(candidates.map((c) => ({ id: c.citationId, file: c.filename, page: c.page, text: c.text.slice(0, 1800) })))}\nOnly mark not_satisfied with affirmative contradictory evidence. Missing evidence needs_verification. Only mark satisfied with directly supporting company evidence. For a simple numeric minimum, provide actualValue, requiredValue and unit in the same units as the requirement; otherwise use null.`,
    });
    const validated = validateComparison(
      raw,
      new Set(candidates.map((c) => c.citationId)),
      tenderIds,
    );
    const guarded = numericGuard(r.text, { ...raw, status: validated.status });
    next = {
      ...r,
      ...validated,
      ...(guarded && guarded !== validated.status
        ? {
            status: guarded,
            needsHumanReview: true,
            reason: `Numeric threshold could not be independently verified. ${validated.reason}`,
          }
        : {}),
    };
  } catch (e) {
    next = {
      ...r,
      status: 'analysis_error',
      reason: e instanceof Error ? e.message : 'Comparison failed',
      gaps: ['Comparison must be retried'],
      needsHumanReview: true,
    };
  }
  const updated = (analysis.requirements as Requirement[]).map((x) =>
    x.id === requirementId ? next : x,
  );
  const done = updated.filter(
    (x) => x.reason !== 'Awaiting evidence comparison',
  ).length;
  await d.collection('analyses').updateOne(
    { _id: analysis._id },
    {
      $set: {
        requirements: updated,
        progress: 45 + Math.round((done / Math.max(1, updated.length)) * 45),
      },
    },
  );
}
async function finishAnalysis(analysisId: string) {
  'use step';
  const d = await db();
  const a = await d.collection('analyses').findOne({ _id: oid(analysisId) });
  if (!a) throw new Error('Analysis missing');
  const requirements = a.requirements as Requirement[];
  const decision = verdict(
    requirements,
    (a.coverageWarnings as string[]).length === 0 &&
      (a.kbWarnings as string[]).length === 0,
  );
  await d.collection('analyses').updateOne(
    { _id: a._id },
    {
      $set: {
        decision,
        status: 'complete',
        progress: 100,
        completedAt: new Date(),
        checklist: requirements
          .filter((r) => r.category === 'submission' || r.gaps.length)
          .map((r) => ({ text: r.text, status: r.status })),
      },
    },
  );
  await d
    .collection('tenders')
    .updateOne(
      { _id: oid(a.tenderId) },
      { $set: { status: 'complete', decision, updatedAt: new Date() } },
    );
}
async function failAnalysis(analysisId: string, message: string) {
  'use step';
  const d = await db();
  await d
    .collection('analyses')
    .updateOne(
      { _id: oid(analysisId) },
      { $set: { status: 'failed', error: message, completedAt: new Date() } },
    );
}
