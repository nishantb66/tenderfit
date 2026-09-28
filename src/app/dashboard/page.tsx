'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowUpRight, Plus, Search, FileText, Clock3 } from 'lucide-react';
type Tender = {
  _id: string;
  title: string;
  createdAt: string;
  status: string;
  decision?: string;
  analysisId?: string;
};
export default function Dashboard() {
  const [rows, setRows] = useState<Tender[]>([]),
    [query, setQuery] = useState(''),
    [status, setStatus] = useState<{
      activeKbVersion?: number;
      ready?: { embeddings: boolean; groq: boolean };
    } | null>(null);
  useEffect(() => {
    fetch('/api/tenders')
      .then((r) => r.json())
      .then((x) => setRows(x.tenders || []));
    fetch('/api/system/status')
      .then((r) => r.json())
      .then(setStatus);
  }, []);
  const filtered = rows.filter((x) =>
    x.title.toLowerCase().includes(query.toLowerCase()),
  );
  const ready = Boolean(
    status?.activeKbVersion && status.ready?.embeddings && status.ready?.groq,
  );
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[.2em] text-neutral-400">
            Your workspace / Overview
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-.06em] sm:text-5xl">
            Tender intelligence
          </h1>
          <p className="mt-3 text-sm text-neutral-500">
            Every bid decision, grounded in the evidence you have.
          </p>
        </div>
        {ready ? (
          <Link
            href="/dashboard/new"
            className="inline-flex items-center gap-2 rounded-full bg-neutral-950 px-5 py-3 text-sm font-semibold text-white hover:bg-neutral-700"
          >
            <Plus size={17} /> New analysis
          </Link>
        ) : (
          <span className="rounded-full bg-neutral-200 px-5 py-3 text-sm font-semibold text-neutral-500">
            Analysis setup required
          </span>
        )}
      </div>
      <div className="mt-10 grid gap-4 lg:grid-cols-[1.45fr_.55fr]">
        <div className="rounded-[26px] bg-neutral-950 p-7 text-white sm:p-9">
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold uppercase tracking-[.2em] text-neutral-500">
              Decision desk
            </span>
            <ArrowUpRight size={19} className="text-neutral-400" />
          </div>
          <h2 className="mt-10 max-w-md text-3xl font-semibold tracking-[-.05em]">
            Bring the next tender into focus.
          </h2>
          <p className="mt-3 max-w-md text-sm leading-6 text-neutral-400">
            Upload a tender and its amendments. We’ll map each requirement to
            published company evidence.
          </p>
          {ready ? (
            <Link
              href="/dashboard/new"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-xs font-semibold text-neutral-950"
            >
              Start an assessment <ArrowUpRight size={15} />
            </Link>
          ) : (
            <p className="mt-8 text-xs text-neutral-400">
              Ask your admin to publish the knowledge base and configure
              semantic search.
            </p>
          )}
        </div>
        <div className="flex flex-col justify-between rounded-[26px] border border-neutral-200 bg-white p-7 sm:p-9">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[.2em] text-neutral-400">
              Knowledge base
            </span>
            <div className="mt-8 text-5xl font-semibold tracking-[-.07em]">
              {status?.activeKbVersion ? `v${status.activeKbVersion}` : '—'}
            </div>
            <p className="mt-2 text-sm text-neutral-500">
              {status?.activeKbVersion
                ? 'Published evidence active'
                : 'Waiting for admin to publish'}
            </p>
          </div>
          <div className="mt-8 flex items-center gap-2 border-t border-neutral-100 pt-5 text-xs text-neutral-500">
            <span
              className={`size-2 rounded-full ${status?.activeKbVersion && status.ready?.embeddings && status.ready?.groq ? 'bg-neutral-950' : 'bg-neutral-300'}`}
            />
            {status?.activeKbVersion &&
            status.ready?.embeddings &&
            status.ready?.groq
              ? 'Ready to analyze'
              : 'Setup required'}
          </div>
        </div>
      </div>
      <section className="mt-12">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              Your analyses
            </h2>
            <p className="mt-1 text-sm text-neutral-400">
              {rows.length} tender{rows.length === 1 ? '' : 's'} in your
              workspace
            </p>
          </div>
          <div className="relative">
            <Search
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tenders"
              className="w-60 rounded-full border border-neutral-200 bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-neutral-500"
            />
          </div>
        </div>
        <div className="mt-6 overflow-hidden rounded-[24px] border border-neutral-200 bg-white">
          {filtered.length ? (
            filtered.map((row) => (
              <Link
                key={row._id}
                href={
                  row.analysisId
                    ? `/report/${row.analysisId}`
                    : `/dashboard/new`
                }
                className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-6 py-5 last:border-0 hover:bg-neutral-50"
              >
                <div className="flex items-center gap-4">
                  <span className="grid size-11 place-items-center rounded-xl bg-neutral-100">
                    <FileText size={19} />
                  </span>
                  <div>
                    <div className="text-sm font-semibold">{row.title}</div>
                    <div className="mt-1 flex items-center gap-1 text-xs text-neutral-400">
                      <Clock3 size={12} />
                      {new Date(row.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="rounded-full border border-neutral-200 px-3 py-1.5 text-xs text-neutral-600">
                    {row.decision || row.status}
                  </span>
                  <ArrowUpRight size={17} />
                </div>
              </Link>
            ))
          ) : (
            <div className="px-6 py-16 text-center">
              <FileText size={25} className="mx-auto text-neutral-300" />
              <p className="mt-4 text-sm font-medium">No tenders yet</p>
              <p className="mt-1 text-xs text-neutral-400">
                Your assessments will appear here.
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
