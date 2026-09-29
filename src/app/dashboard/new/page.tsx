'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, FileUp, FileText, Plus, X } from 'lucide-react';
import Link from 'next/link';
import { MAX_FILES, MAX_TOTAL_UPLOAD_BYTES } from '@/config/pipeline';
export default function NewTender() {
  const router = useRouter(),
    [title, setTitle] = useState(''),
    [context, setContext] = useState(''),
    [closingDate, setClosingDate] = useState(''),
    [industry, setIndustry] = useState(''),
    [tenderUrl, setTenderUrl] = useState(''),
    [files, setFiles] = useState<File[]>([]),
    [step, setStep] = useState(1),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  function selectFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.currentTarget.files || []);
    if (!selected.length) return;
    if (selected.length > MAX_FILES) {
      setFiles([]);
      setError(`Choose no more than ${MAX_FILES} files.`);
      event.currentTarget.value = '';
      return;
    }
    if (selected.some((file) => !/\.(pdf|docx)$/i.test(file.name))) {
      setFiles([]);
      setError('Choose PDF or DOCX files only.');
      event.currentTarget.value = '';
      return;
    }
    if (
      selected.reduce((total, file) => total + file.size, 0) >
      MAX_TOTAL_UPLOAD_BYTES
    ) {
      setFiles([]);
      setError('Combined file size must be 3.5 MB or less.');
      event.currentTarget.value = '';
      return;
    }
    setFiles(selected);
    setError('');
  }
  async function start() {
    setBusy(true);
    setError('');
    try {
      const form = new FormData();
      form.set('title', title);
      form.set('context', context);
      form.set('closingDate', closingDate);
      form.set('industry', industry);
      form.set('tenderUrl', tenderUrl);
      files.forEach((f) => form.append('files', f));
      const created = await fetch('/api/tenders', {
        method: 'POST',
        body: form,
      });
      const c = await created.json();
      if (!created.ok) throw new Error(c.error?.message || 'Upload failed');
      const analysis = await fetch(`/api/tenders/${c.id}/analyze`, {
        method: 'POST',
      });
      const a = await analysis.json();
      if (!analysis.ok)
        throw new Error(a.error?.message || 'Analysis could not start');
      router.push(`/report/${a.analysisId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start');
      setBusy(false);
    }
  }
  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-500 transition hover:-translate-x-0.5 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950"
      >
        <ArrowLeft size={15} /> Back to overview
      </Link>
      <div className="mt-11 flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[.2em] text-neutral-400">
            New assessment / Step {step} of 2
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-.065em] sm:text-5xl">
            {step === 1 ? 'Add tender documents' : 'Confirm and analyze'}
          </h1>
          <p className="mt-3 text-sm text-neutral-500">
            {step === 1
              ? 'Start with the main RFP, then add amendments and annexures in order.'
              : 'Check the package details before analysis begins.'}
          </p>
        </div>
        <div className="hidden text-xs text-neutral-400 sm:block">
          {step === 1 ? '01 — Upload' : '02 — Confirm'}
        </div>
      </div>
      <div className="mt-9 h-1 overflow-hidden rounded-full bg-stone-200">
        <div
          className={`h-full bg-neutral-950 motion-safe:transition-all motion-safe:duration-500 ${step === 1 ? 'w-1/2' : 'w-full'}`}
        />
      </div>
      {step === 1 ? (
        <div className="mt-9 space-y-7 rounded-[30px] border border-stone-200 bg-white p-6 shadow-[0_18px_50px_-42px_rgba(0,0,0,.45)] sm:p-10">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[.12em] text-neutral-500">
              Tender name *
            </span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. City water network modernization"
              className="mt-3 w-full rounded-2xl border border-stone-200 bg-stone-50/50 px-4 py-4 text-sm outline-none transition focus:border-neutral-950 focus:bg-white focus:ring-4 focus:ring-stone-200/70"
            />
          </label>
          <div>
            <label
              htmlFor="file-upload"
              className="text-xs font-semibold uppercase tracking-[.12em] text-neutral-500"
            >
              Tender package *
            </label>
            <div className="relative mt-3 flex flex-col items-center rounded-[24px] border border-dashed border-stone-300 bg-stone-50 px-6 py-14 text-center transition-colors duration-200 hover:border-neutral-950 hover:bg-stone-100/70 focus-within:border-neutral-950 focus-within:ring-4 focus-within:ring-stone-200">
              <input
                type="file"
                accept=".pdf,.docx"
                multiple
                onChange={selectFiles}
                className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                id="file-upload"
                aria-label="Choose tender PDF or DOCX files"
              />
              <span className="grid size-14 place-items-center rounded-2xl border border-stone-200 bg-white shadow-sm">
                <FileUp size={22} />
              </span>
              <span className="mt-4 text-sm font-semibold">
                {files.length
                  ? `${files.length} file${files.length === 1 ? '' : 's'} selected`
                  : 'Choose PDF or DOCX files'}
              </span>
              <span className="mt-1 text-xs text-neutral-400">
                Main tender first · up to 6 files · 3.5 MB combined
              </span>
            </div>
            <p className="mt-2 text-xs text-neutral-500">
              Files are uploaded after you confirm and start analysis.
            </p>
            {error && (
              <p role="alert" className="mt-2 text-xs text-red-700">
                {error}
              </p>
            )}
          </div>
          {files.length > 0 && (
            <div className="space-y-2">
              {files.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50/60 px-4 py-3.5"
                >
                  <FileText size={16} />
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {f.name}
                  </span>
                  <span className="text-xs text-neutral-400">
                    {i === 0 ? 'Main tender' : 'Annexure'}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[.12em] text-neutral-500">
                Closing date
              </span>
              <input
                type="date"
                value={closingDate}
                onChange={(e) => setClosingDate(e.target.value)}
                className="mt-3 w-full rounded-2xl border border-stone-200 bg-stone-50/50 px-4 py-4 text-sm outline-none transition focus:border-neutral-950 focus:bg-white focus:ring-4 focus:ring-stone-200/70"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[.12em] text-neutral-500">
                Context (optional)
              </span>
              <input
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Anything your team should know"
                className="mt-3 w-full rounded-2xl border border-stone-200 bg-stone-50/50 px-4 py-4 text-sm outline-none transition focus:border-neutral-950 focus:bg-white focus:ring-4 focus:ring-stone-200/70"
              />
            </label>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[.12em] text-neutral-500">
                Industry (optional)
              </span>
              <input
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="e.g. Infrastructure"
                className="mt-3 w-full rounded-2xl border border-stone-200 bg-stone-50/50 px-4 py-4 text-sm outline-none transition focus:border-neutral-950 focus:bg-white focus:ring-4 focus:ring-stone-200/70"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[.12em] text-neutral-500">
                Tender URL (optional)
              </span>
              <input
                type="url"
                value={tenderUrl}
                onChange={(e) => setTenderUrl(e.target.value)}
                placeholder="https://"
                className="mt-3 w-full rounded-2xl border border-stone-200 bg-stone-50/50 px-4 py-4 text-sm outline-none transition focus:border-neutral-950 focus:bg-white focus:ring-4 focus:ring-stone-200/70"
              />
            </label>
          </div>
          <div className="flex justify-end">
            <button
              disabled={!title || !files.length}
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-2 rounded-full bg-neutral-950 px-6 py-3.5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
            >
              Continue <ArrowRight size={17} />
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-9 rounded-[30px] border border-stone-200 bg-white p-6 shadow-[0_18px_50px_-42px_rgba(0,0,0,.45)] sm:p-10">
          <div className="text-xs font-semibold uppercase tracking-[.2em] text-neutral-400">
            Package summary
          </div>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight">
            {title}
          </h2>
          <p className="mt-2 text-sm text-neutral-500">
            {files.length} source file{files.length === 1 ? '' : 's'} ·{' '}
            {closingDate || 'No closing date provided'}
          </p>
          <div className="mt-8 divide-y divide-neutral-100 rounded-2xl border border-neutral-100">
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-3 p-4 text-sm">
                <FileText size={17} />
                <span className="flex-1">{f.name}</span>
                <span className="text-xs text-neutral-400">
                  {i === 0 ? 'Main tender' : `Annexure ${i}`}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-7 text-xs leading-6 text-neutral-500">
            By starting, you confirm these files and their order are correct.
            Analysis uses the currently published company knowledge base;
            uncertain or unreadable sections will be flagged for review.
          </p>
          {error && (
            <p
              role="alert"
              className="mt-5 rounded-xl bg-neutral-100 p-4 text-sm text-neutral-800"
            >
              {error}
            </p>
          )}
          <div className="mt-8 flex items-center justify-between">
            <button
              onClick={() => setStep(1)}
              className="text-sm font-semibold text-neutral-500"
            >
              Edit package
            </button>
            <button
              disabled={busy}
              onClick={start}
              className="inline-flex items-center gap-2 rounded-full bg-neutral-950 px-6 py-3.5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {busy ? 'Starting…' : 'Start analysis'} <ArrowRight size={17} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
