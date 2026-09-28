import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { ObjectId } from 'mongodb';
import { bucket, db, oid } from './db';
import {
  MAX_FILE_BYTES,
  MAX_PDF_PAGES,
  PARSER_VERSION,
} from '@/config/pipeline';
export type Passage = {
  id: string;
  page: number;
  section: string;
  text: string;
  excerptHash: string;
};
export async function saveFile(
  file: File,
  owner: string,
  organizationId: string,
) {
  if (file.size > MAX_FILE_BYTES || file.size < 1)
    throw new Error('File must be between 1 byte and 3.5 MB');
  const filename = file.name.replace(/[^\w. -]/g, '_').slice(0, 120);
  const type = filename.toLowerCase().endsWith('.pdf')
    ? 'pdf'
    : filename.toLowerCase().endsWith('.docx')
      ? 'docx'
      : null;
  if (!type) throw new Error('Only PDF and DOCX files are supported');
  const buffer = Buffer.from(await file.arrayBuffer());
  if (type === 'pdf' && buffer.subarray(0, 5).toString() !== '%PDF-')
    throw new Error('Invalid PDF content');
  if (type === 'docx' && buffer.subarray(0, 2).toString() !== 'PK')
    throw new Error('Invalid DOCX content');
  const sha256 = createHash('sha256').update(buffer).digest('hex');
  const storageId = new ObjectId();
  const stream = (await bucket()).openUploadStreamWithId(storageId, filename, {
    metadata: { owner, organizationId, sha256, type },
  });
  await new Promise<void>((resolve, reject) => {
    Readable.from(buffer)
      .pipe(stream)
      .on('finish', resolve)
      .on('error', reject);
  });
  return {
    storageId: storageId.toString(),
    filename,
    sha256,
    type,
    size: file.size,
    parserVersion: PARSER_VERSION,
  };
}
export async function readFile(storageId: string) {
  const stream = (await bucket()).openDownloadStream(oid(storageId));
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}
export async function parseFile(
  storageId: string,
  filename: string,
): Promise<{ passages: Passage[]; warnings: string[]; pages: number }> {
  const buffer = await readFile(storageId);
  const passages: Passage[] = [];
  const warnings: string[] = [];
  if (filename.toLowerCase().endsWith('.pdf')) {
    const pdfParse = (await import('pdf-parse')).default;
    const parsed = await pdfParse(buffer, {
      pagerender: async (page: {
        getTextContent: () => Promise<{ items: Array<{ str?: string }> }>;
      }) =>
        (await page.getTextContent()).items.map((i) => i.str || '').join(' ') +
        '\f',
    });
    if (parsed.numpages > MAX_PDF_PAGES)
      throw new Error(
        `PDF has ${parsed.numpages} pages; limit is ${MAX_PDF_PAGES}`,
      );
    const pages = parsed.text.split('\f').filter(Boolean);
    pages.forEach((text, i) => {
      if (text.trim().length < 40)
        warnings.push(`Page ${i + 1} has little extractable text`);
      passages.push(makePassage(storageId, i + 1, `Page ${i + 1}`, text));
    });
    return { passages, warnings, pages: parsed.numpages };
  }
  const mammoth = await import('mammoth');
  const result = await mammoth.extractRawText({ buffer });
  const paragraphs = result.value
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  paragraphs.forEach((text, i) =>
    passages.push(makePassage(storageId, i + 1, `Paragraph ${i + 1}`, text)),
  );
  warnings.push(...result.messages.map((m) => m.message));
  return { passages, warnings, pages: paragraphs.length };
}
function makePassage(
  fileId: string,
  page: number,
  section: string,
  text: string,
): Passage {
  return {
    id: hashPart(fileId + ':' + page + ':' + text),
    page,
    section,
    text: text.trim(),
    excerptHash: hashPart(text.trim()),
  };
}
function hashPart(value: string) {
  return createHash('sha256').update(value).digest('hex');
}
export async function authorizedFile(
  storageId: string,
  sub: string,
  role: string,
) {
  const d = await db();
  const doc = await d.collection('file_access').findOne({
    storageId,
    $or: [
      { ownerUserId: sub },
      ...(role === 'admin' ? [{ adminReadable: true }] : []),
    ],
  });
  if (!doc) {
    const source = await d
      .collection('kb_chunks')
      .findOne({ sourceFileId: storageId }, { projection: { kbVersion: 1 } });
    const ids = source
      ? await d.collection('kb_chunks').distinct('citationId', {
          sourceFileId: storageId,
          kbVersion: source.kbVersion,
        })
      : [];
    const allowed =
      source &&
      (await d.collection('analyses').findOne({
        ownerUserId: sub,
        kbVersion: source.kbVersion,
        'requirements.companyCitationIds': { $in: ids },
      }));
    if (!allowed) throw new Error('File not found');
  }
  return readFile(storageId);
}
