'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Download,
  FileText,
  ExternalLink,
  Clock3,
  AlertCircle,
  CheckCircle2,
  Search,
} from 'lucide-react';
type Req = {
  id: string;
  text: string;
  category: string;
  mandatory: boolean;
  status: string;
  reason: string;
  gaps?: string[];
  tenderCitationIds: string[];
  companyCitationIds: string[];
  reviewed?: { by: string; reason: string };
};
type Analysis = {
  title: string;
  status: string;
  decision?: string;
  progress: number;
  error?: string;
  kbVersion: number;
  model: string;
  createdAt: string;
  completedAt?: string;
  coverageWarnings?: string[];
  kbWarnings?: string[];
  requirements: Req[];
  checklist?: { text: string; status: string }[];
};
type Citation = {
  id?: string;
  citationId?: string;
  text: string;
  page: number;
  section: string;
  filename: string;
  fileId?: string;
  sourceFileId?: string;
};
export function ReportView({ id, isAdmin }: { id: string; isAdmin: boolean }) {
  const [data, setData] = useState<{
      analysis: Analysis;
      citations: Citation[];
      usage: { _id: string; promptTokens: number; completionTokens: number }[];
    } | null>(null),
    [selected, setSelected] = useState<Req | null>(null),
    [error, setError] = useState(''),
    [retrying, setRetrying] = useState(false),
    [retryError, setRetryError] = useState('');
  useEffect(() => {
    let live = true;
    async function load() {
      const r = await fetch(`/api/analyses/${id}`, { cache: 'no-store' });
      const x = await r.json();
      if (!live) return;
      if (r.ok) setData(x);
      else setError(x.error?.message || 'Report unavailable');
    }
    load();
    const timer = setInterval(() => {
      if (!data || !['complete', 'failed'].includes(data.analysis.status))
        load();
    }, 4000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [id, data?.analysis.status]);
  const a = data?.analysis;
  async function retryErrors() {
    setRetrying(true);
    setRetryError('');
    try {
      const response = await fetch(`/api/analyses/${id}/retry`, {
        method: 'POST',
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error?.message || 'Retry could not start');
      setData(
        (current) =>
          current && {
            ...current,
            analysis: {
              ...current.analysis,
              status: 'comparing',
              progress: 45,
            },
          },
      );
    } catch (e) {
      setRetryError(e instanceof Error ? e.message : 'Retry could not start');
    } finally {
      setRetrying(false);
    }
  }
  function downloadCsv() {
    if (!a) return;
    const csv = [
      'id,requirement,status,mandatory,reason',
      ...a.requirements.map((r) =>
        [r.id, r.text, r.status, r.mandatory, r.reason]
          .map((x) => `"${String(x).replaceAll('"', '""')}"`)
          .join(','),
      ),
    ].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `tenderfit-${id}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div>
      <Link
        href={isAdmin ? '/admin/analyses' : '/dashboard'}
        className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-500 transition hover:-translate-x-0.5 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950"
      >
        <ArrowLeft size={15} /> Back to analyses
      </Link>
      {error ? (
        <div className="mt-8 rounded-2xl bg-white p-8 text-sm">{error}</div>
      ) : !a ? (
        <div className="mt-8 animate-pulse rounded-2xl bg-neutral-200 p-20" />
      ) : (
        <>
          <div className="mt-9 flex flex-wrap items-start justify-between gap-6 border-b border-stone-200 pb-9">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[.2em] text-neutral-400">
                Evidence report / {new Date(a.createdAt).toLocaleDateString()}
              </p>
              <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-.065em] sm:text-[3.5rem]">
                {a.title}
              </h1>
              <p className="mt-3 text-sm text-neutral-500">
                Knowledge base v{a.kbVersion} · {a.model}
              </p>
            </div>
            {a.status === 'complete' && (
              <div className="flex flex-wrap gap-2">
                {!isAdmin &&
                  (!a.requirements.length ||
                    a.requirements.some(
                      (r) => r.status === 'analysis_error',
                    )) && (
                    <button
                      onClick={retryErrors}
                      disabled={retrying}
                      className="rounded-full border border-stone-200 bg-white px-4 py-3 text-xs font-semibold transition hover:border-neutral-950 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 disabled:opacity-50"
                    >
                      {retrying
                        ? 'Starting retry…'
                        : a.requirements.length
                          ? 'Retry analysis errors'
                          : 'Retry extraction'}
                    </button>
                  )}
                <button
                  onClick={downloadCsv}
                  className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-3 text-xs font-semibold transition hover:border-neutral-950 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950"
                >
                  <Download size={15} /> CSV
                </button>
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 rounded-full bg-neutral-950 px-4 py-3 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2"
                >
                  <Download size={15} /> PDF
                </button>
              </div>
            )}
          </div>
          {retryError && (
            <p role="alert" className="mt-4 text-sm text-red-700">
              {retryError}
            </p>
          )}
          {a.status !== 'complete' ? (
            <div className="mt-10 rounded-[26px] border border-neutral-200 bg-white p-9">
              <div className="flex items-center gap-3">
                <Clock3 size={21} />
                <h2 className="text-xl font-semibold">
                  {a.status === 'failed'
                    ? 'Analysis stopped'
                    : 'Analysis in progress'}
                </h2>
              </div>
              <p className="mt-3 text-sm text-neutral-500">
                {a.error ||
                  'We are reading the tender and checking each requirement against your published evidence.'}
              </p>
              <div className="mt-7 h-2 overflow-hidden rounded-full bg-neutral-100">
                <div
                  className="h-full bg-neutral-950 transition-all"
                  style={{ width: `${a.progress || 0}%` }}
                />
              </div>
              <p className="mt-2 text-right text-xs text-neutral-400">
                {a.progress || 0}%
              </p>
            </div>
          ) : (
            <>
              <div className="mt-9 grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
                <div className="relative overflow-hidden rounded-[30px] bg-neutral-950 p-8 text-white shadow-[0_28px_60px_-45px_rgba(0,0,0,.75)]">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-20 -top-32 size-80 rounded-full border border-white/10"
                  />
                  <p className="text-[11px] font-bold uppercase tracking-[.2em] text-neutral-500">
                    Assessment outcome
                  </p>
                  <div className="relative mt-10 text-4xl font-semibold tracking-[-.065em]">
                    {a.decision}
                  </div>
                  <p className="mt-4 max-w-xl text-sm leading-6 text-neutral-400">
                    {a.decision === 'Likely eligible'
                      ? 'Mandatory requirements are supported by cited company evidence. Confirm final submission details with your team.'
                      : a.decision === 'Likely ineligible'
                        ? 'One or more mandatory requirements have cited counterevidence. Review the blockers before making a bid decision.'
                        : 'Some requirements or source pages need a human check before a reliable go/no-go call.'}
                  </p>
                  <div className="mt-10 border-t border-neutral-800 pt-5 text-xs text-neutral-500">
                    Decision support only · Human review required
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-[24px] border border-stone-200 bg-white p-6 shadow-[0_18px_50px_-44px_rgba(0,0,0,.45)]">
                    <div className="text-4xl font-semibold">
                      {
                        a.requirements.filter((r) => r.status === 'satisfied')
                          .length
                      }
                    </div>
                    <div className="mt-2 text-xs text-neutral-500">
                      Supported
                    </div>
                  </div>
                  <div className="rounded-[24px] border border-stone-200 bg-white p-6 shadow-[0_18px_50px_-44px_rgba(0,0,0,.45)]">
                    <div className="text-4xl font-semibold">
                      {
                        a.requirements.filter(
                          (r) => r.status === 'needs_verification',
                        ).length
                      }
                    </div>
                    <div className="mt-2 text-xs text-neutral-500">
                      Needs review
                    </div>
                  </div>
                  <div className="rounded-[24px] border border-stone-200 bg-white p-6 shadow-[0_18px_50px_-44px_rgba(0,0,0,.45)]">
                    <div className="text-4xl font-semibold">
                      {
                        a.requirements.filter(
                          (r) => r.status === 'not_satisfied',
                        ).length
                      }
                    </div>
                    <div className="mt-2 text-xs text-neutral-500">
                      Not satisfied
                    </div>
                  </div>
                  <div className="rounded-[24px] border border-stone-200 bg-white p-6 shadow-[0_18px_50px_-44px_rgba(0,0,0,.45)]">
                    <div className="text-4xl font-semibold">
                      {
                        a.requirements.filter(
                          (r) => r.status === 'analysis_error',
                        ).length
                      }
                    </div>
                    <div className="mt-2 text-xs text-neutral-500">
                      Analysis errors
                    </div>
                  </div>
                </div>
              </div>
              {Boolean(a.coverageWarnings?.length || a.kbWarnings?.length) && (
                <div className="mt-6 flex gap-3 rounded-2xl border border-neutral-200 bg-white p-5 text-sm">
                  <AlertCircle size={19} className="shrink-0" />
                  <div>
                    <b>Coverage limitations</b>
                    <ul className="mt-2 list-inside list-disc text-xs leading-6 text-neutral-500">
                      {[
                        ...(a.coverageWarnings || []),
                        ...(a.kbWarnings || []),
                      ].map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              <section className="mt-12">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[.2em] text-neutral-400">
                      Assessment detail
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                      Requirements
                    </h2>
                  </div>
                  <span className="text-xs text-neutral-400">
                    {a.requirements.length} extracted
                  </span>
                </div>
                <div className="mt-6 overflow-hidden rounded-[28px] border border-stone-200 bg-white shadow-[0_18px_50px_-44px_rgba(0,0,0,.45)]">
                  {a.requirements.length ? (
                    a.requirements.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => setSelected(r)}
                        className="group flex w-full flex-wrap items-center justify-between gap-4 border-b border-stone-100 px-6 py-5 text-left transition-colors duration-200 last:border-0 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-950"
                      >
                        <div className="max-w-2xl">
                          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.15em] text-neutral-400">
                            <span>{r.id}</span>
                            <span>·</span>
                            <span>{r.category}</span>
                            {r.mandatory && (
                              <span className="rounded-full bg-neutral-100 px-2 py-1 text-neutral-700">
                                Mandatory
                              </span>
                            )}
                          </div>
                          <p className="mt-2 text-sm font-medium leading-6">
                            {r.text}
                          </p>
                        </div>
                        <span className="flex items-center gap-2 whitespace-nowrap text-xs font-semibold">
                          <span
                            className={`size-2 rounded-full ${r.status === 'satisfied' ? 'bg-black' : r.status === 'not_satisfied' ? 'bg-neutral-600' : 'bg-neutral-300'}`}
                          />
                          {r.status.replaceAll('_', ' ')}{' '}
                          <ExternalLink
                            size={14}
                            className="ml-2 text-neutral-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                          />
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="p-10 text-sm text-neutral-500">
                      No requirements could be extracted. Review source
                      coverage.
                    </div>
                  )}
                </div>
              </section>
              <section className="mt-12 grid gap-6 lg:grid-cols-2">
                <div className="rounded-[28px] border border-stone-200 bg-white p-7 shadow-[0_18px_50px_-44px_rgba(0,0,0,.45)]">
                  <h2 className="text-lg font-semibold">
                    Submission checklist
                  </h2>
                  <div className="mt-5 space-y-4">
                    {a.checklist?.length ? (
                      a.checklist.map((item, i) => (
                        <div key={i} className="flex gap-3 text-sm">
                          <CheckCircle2
                            size={17}
                            className="shrink-0 text-neutral-400"
                          />
                          <span>{item.text}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-neutral-400">
                        No explicit document requests or gaps found.
                      </p>
                    )}
                  </div>
                </div>
                <div className="rounded-[28px] border border-stone-200 bg-white p-7 shadow-[0_18px_50px_-44px_rgba(0,0,0,.45)]">
                  <h2 className="text-lg font-semibold">Report provenance</h2>
                  <div className="mt-5 space-y-3 text-sm text-neutral-500">
                    <div className="flex justify-between">
                      <span>Knowledge base</span>
                      <b className="text-black">v{a.kbVersion}</b>
                    </div>
                    <div className="flex justify-between">
                      <span>Reasoning model</span>
                      <b className="text-black">{a.model}</b>
                    </div>
                    <div className="flex justify-between">
                      <span>Generated</span>
                      <b className="text-black">
                        {a.completedAt
                          ? new Date(a.completedAt).toLocaleString()
                          : '—'}
                      </b>
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}
          {selected && (
            <div
              className="fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-[3px]"
              onClick={() => setSelected(null)}
            >
              <div
                className="h-full w-full max-w-2xl overflow-y-auto border-l border-stone-200 bg-[#fdfcfb] p-7 shadow-2xl sm:p-10"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setSelected(null)}
                  className="text-xs font-semibold text-neutral-500"
                >
                  ← Close evidence
                </button>
                <p className="mt-10 text-[11px] font-bold uppercase tracking-[.2em] text-neutral-400">
                  {selected.id} / {selected.category}
                </p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight">
                  {selected.text}
                </h2>
                <div className="mt-6 rounded-[24px] border border-stone-200 bg-white p-6">
                  <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    {selected.status.replaceAll('_', ' ')}
                  </p>
                  <p className="mt-2 text-sm leading-6">{selected.reason}</p>
                </div>
                {selected.gaps?.length ? (
                  <div className="mt-7">
                    <h3 className="text-sm font-semibold">Open gaps</h3>
                    <ul className="mt-2 list-inside list-disc text-sm leading-7 text-neutral-600">
                      {selected.gaps.map((g, i) => (
                        <li key={i}>{g}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <h3 className="mt-8 text-sm font-semibold">Tender source</h3>
                <div className="mt-3 space-y-3">
                  {selected.tenderCitationIds.map((cid) => (
                    <CitationCard
                      key={cid}
                      citation={data?.citations.find((c) => c.id === cid)}
                    />
                  ))}
                </div>
                <h3 className="mt-8 text-sm font-semibold">Company evidence</h3>
                <div className="mt-3 space-y-3">
                  {selected.companyCitationIds.length ? (
                    selected.companyCitationIds.map((cid) => (
                      <CitationCard
                        key={cid}
                        citation={data?.citations.find(
                          (c) => c.citationId === cid,
                        )}
                      />
                    ))
                  ) : (
                    <p className="text-sm text-neutral-400">
                      No supporting company citation linked.
                    </p>
                  )}
                </div>
                {selected.reviewed && (
                  <div className="mt-8 rounded-xl border border-neutral-200 p-4 text-xs text-neutral-500">
                    Reviewed by {selected.reviewed.by}:{' '}
                    {selected.reviewed.reason}
                  </div>
                )}
                {isAdmin && (
                  <ReviewButton id={id} requirementId={selected.id} />
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
function CitationCard({ citation }: { citation?: Citation }) {
  return citation ? (
    <div className="rounded-2xl border border-neutral-200 p-5">
      <div className="flex items-center justify-between text-xs font-semibold">
        <span>
          {citation.filename} · {citation.section}
        </span>
        <a
          href={`/api/files/${citation.fileId || citation.sourceFileId}`}
          className="inline-flex items-center gap-1 text-neutral-500"
        >
          Source <ExternalLink size={12} />
        </a>
      </div>
      <p className="mt-3 max-h-44 overflow-y-auto text-xs leading-6 text-neutral-600">
        {citation.text}
      </p>
    </div>
  ) : (
    <div className="rounded-xl bg-neutral-100 p-4 text-xs text-neutral-500">
      Citation unavailable; review required.
    </div>
  );
}
function ReviewButton({
  id,
  requirementId,
}: {
  id: string;
  requirementId: string;
}) {
  const [reason, setReason] = useState(''),
    [saved, setSaved] = useState(false);
  async function save() {
    const r = await fetch(`/api/analyses/${id}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requirementId, reason }),
    });
    setSaved(r.ok);
  }
  return (
    <div className="mt-10 border-t border-neutral-200 pt-6">
      <h3 className="text-sm font-semibold">Human review</h3>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Record review reason without changing the AI judgment"
        className="mt-3 w-full rounded-xl border border-neutral-200 p-4 text-sm"
      />
      <button
        onClick={save}
        disabled={reason.length < 5}
        className="mt-3 rounded-full bg-neutral-950 px-5 py-3 text-xs font-semibold text-white disabled:opacity-40"
      >
        {saved ? 'Saved' : 'Mark reviewed'}
      </button>
    </div>
  );
}
