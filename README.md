# TenderFit

TenderFit is a single Next.js application for evidence-linked tender assessment. It uses Tailwind CSS for the interface, MongoDB Atlas/GridFS for private documents and job state, Voyage AI for embeddings, Atlas Search plus Vector Search for retrieval, Groq for requirement extraction and comparison, and Workflow DevKit for durable background runs.

## Local setup

1. Use Node.js 20.9+ and run `npm install`.
2. Fill `.env.local` from `.env.example`. Never commit it. `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `MONGODB_URI`, `GROQ_API_KEY`, and `VOYAGE_API_KEY` are required for the complete flow. Generate a random `AUTH_SECRET`. Set `APP_BASE_URL=http://localhost:3000`.
3. In Google Cloud Console, authorize the exact redirect URI `http://localhost:3000/api/google/callback/`. Add your account as a consent-screen test user if the OAuth app is in testing.
   The supplied OAuth client currently shows **Voidly** on Google's sign-in screen. Update the consent-screen branding to TenderFit before inviting users.
4. Provision an Atlas cluster that supports Search and Vector Search. Run `node --env-file=.env.local scripts/setup-indexes.mjs`, then wait until `kb_vector_index` and `kb_text_index` are queryable. The embeddings use Voyage `voyage-3.5` with 1024 dimensions. Do not mix embedding models within a KB version.
5. Run `npm run dev`. Sign in as the configured admin account, choose **Admin Login**, upload company PDFs/DOCX, and run **Extract Engine**. Once a version is published, choose **General User** to submit tenders.

## Current boundaries

- File uploads are capped at 3.5 MB per request, six tender files per analysis, and 30 PDF pages per file, so uploads remain below the Vercel function payload cap. Originals are stored privately in GridFS and served only through authorized routes.
- Text PDFs and DOCX are supported. Image-only scans are flagged; OCR is not configured. DOCX citations refer to paragraph anchors, not printed page numbers.
- Atlas Search indexes and a Voyage key must be present. An index probe runs before KB publication. Analysis is blocked without a published KB and required AI services.
- A report retains its KB/model version and uses `needs_verification` for missing evidence. Verified positive and negative findings require resolved source IDs.
- Structured evidence cards are extracted from source chunks and used to boost retrieval. Simple numeric minimums receive a deterministic check; multi-year averages are routed to human review.
- Auto model routing, full financial calculations, malware scanning, larger direct uploads, and detailed amendment precedence are not implemented yet. Do not use the current build as a production eligibility authority.

## Commands

`npm run dev` starts the local app. `npm run typecheck`, `npm test`, and `npm run build` verify the source. The fictional public sample is at `/sample`.

## Vercel preparation

Create one Vercel project from this repository. Configure the same server-side environment variables in encrypted Vercel settings, with `APP_BASE_URL` set to the production HTTPS origin. Add that origin and the exact `/api/google/callback/` URI to Google OAuth. Provision Workflow on the target Vercel account/project, make Atlas reachable from Vercel with the narrowest suitable network rules, and run the index setup once against the production database. Do not deploy until you have exercised a real admin build and tender analysis with non-sensitive fixtures. No production deployment was performed as part of this local build.
