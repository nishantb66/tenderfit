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
      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-stone-200 pb-9">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[.2em] text-neutral-400">
            Your workspace / Overview
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-.065em] sm:text-[3.5rem]">
            Tender intelligence
          </h1>
          <p className="mt-4 text-sm leading-6 text-neutral-500">
            Every bid decision, grounded in the evidence you have.
          </p>
        </div>
        {ready ? (
          <Link
            href="/dashboard/new"
            className="inline-flex items-center gap-2 rounded-full bg-neutral-950 px-5 py-3.5 text-sm font-semibold text-white shadow-[0_12px_25px_-16px_rgba(0,0,0,.8)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2"
          >
            <Plus size={17} /> New analysis
          </Link>
        ) : (
          <span className="rounded-full bg-neutral-200 px-5 py-3 text-sm font-semibold text-neutral-500">
            Analysis setup required
          </span>
        )}
      </div>
      <div className="mt-9 grid gap-4 lg:grid-cols-[1.45fr_.55fr]">
        <div className="relative overflow-hidden rounded-[30px] bg-neutral-950 p-7 text-white shadow-[0_28px_60px_-45px_rgba(0,0,0,.75)] sm:p-9">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-44 size-[410px] rounded-full border border-white/10"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-5 -top-28 size-[300px] rounded-full border border-white/10"
          />
          <div className="relative">
            <div className="flex items-start justify-between">
              <span className="text-xs font-semibold uppercase tracking-[.2em] text-neutral-500">
                Decision desk
              </span>
              <ArrowUpRight size={19} className="text-neutral-400" />
            </div>
            <h2 className="mt-12 max-w-md text-3xl font-semibold tracking-[-.055em] sm:text-4xl">
              Bring the next tender into focus.
            </h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-neutral-400">
              Upload a tender and its amendments. We’ll map each requirement to
              published company evidence.
            </p>
            {ready ? (
              <Link
                href="/dashboard/new"
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-xs font-semibold text-neutral-950 transition-all duration-200 hover:-translate-y-0.5 hover:bg-stone-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
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
        </div>
        <div className="flex flex-col justify-between rounded-[30px] border border-stone-200 bg-white p-7 shadow-[0_18px_50px_-42px_rgba(0,0,0,.45)] sm:p-9">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[.2em] text-neutral-400">
              Knowledge base
            </span>
            <div className="mt-9 text-6xl font-semibold tracking-[-.075em]">
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
      <section className="mt-14">
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
              className="w-60 rounded-full border border-stone-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-neutral-950 focus:ring-4 focus:ring-stone-200/70"
            />
          </div>
        </div>
        <div className="mt-6 overflow-hidden rounded-[28px] border border-stone-200 bg-white shadow-[0_18px_50px_-44px_rgba(0,0,0,.45)]">
          {filtered.length ? (
            filtered.map((row) => (
              <Link
                key={row._id}
                href={
                  row.analysisId
                    ? `/report/${row.analysisId}`
                    : `/dashboard/new`
                }
                className="group flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 px-6 py-5 transition-colors duration-200 last:border-0 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-950"
              >
                <div className="flex items-center gap-4">
                  <span className="grid size-11 place-items-center rounded-2xl bg-stone-100 transition-colors group-hover:bg-stone-200">
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
                  <ArrowUpRight
                    size={17}
                    className="text-neutral-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-neutral-950"
                  />
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
