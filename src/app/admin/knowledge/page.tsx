'use client';
import { useEffect, useState } from 'react';
import {
  Database,
  FileUp,
  FileText,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
type Doc = {
  _id: string;
  filename: string;
  typeLabel: string;
  status: string;
  createdAt: string;
  size: number;
};
type Build = {
  _id: string;
  version: number;
  status: string;
  progress: number;
  warnings?: string[];
  error?: string;
};
export default function Knowledge() {
  const [docs, setDocs] = useState<Doc[]>([]),
    [builds, setBuilds] = useState<Build[]>([]),
    [version, setVersion] = useState(0),
    [file, setFile] = useState<File | null>(null),
    [type, setType] = useState('Company evidence'),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function load() {
    const [d, o, s] = await Promise.all([
      fetch('/api/admin/kb/documents').then((r) => r.json()),
      fetch('/api/admin/overview').then((r) => r.json()),
      fetch('/api/system/status').then((r) => r.json()),
    ]);
    setDocs(d.documents || []);
    setBuilds(o.builds || []);
    setVersion(s.activeKbVersion || 0);
  }
  useEffect(() => {
    load();
    const i = setInterval(load, 5000);
    return () => clearInterval(i);
  }, []);
  async function upload() {
    if (!file) return;
    setBusy(true);
    setError('');
    const f = new FormData();
    f.set('file', file);
    f.set('type', type);
    const r = await fetch('/api/admin/kb/documents', {
      method: 'POST',
      body: f,
    });
    const x = await r.json();
    if (!r.ok) setError(x.error?.message || 'Upload failed');
    else {
      setFile(null);
      await load();
    }
    setBusy(false);
  }
  async function remove(id: string) {
    if (!confirm('Remove this document from the next published version?'))
      return;
    const r = await fetch(`/api/admin/kb/documents/${id}`, {
      method: 'DELETE',
    });
    if (r.ok) load();
  }
  async function build() {
    if (
      !confirm('Run Extract Engine and publish a new knowledge base version?')
    )
      return;
    setBusy(true);
    setError('');
    const r = await fetch('/api/admin/kb/build', { method: 'POST' });
    const x = await r.json();
    if (!r.ok) setError(x.error?.message || 'Build failed to start');
    await load();
    setBusy(false);
  }
  async function rollback(v: number) {
    if (!confirm(`Restore published version ${v} as active?`)) return;
    const r = await fetch('/api/admin/kb/rollback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version: v }),
    });
    const x = await r.json();
    if (!r.ok) setError(x.error?.message || 'Rollback failed');
    await load();
  }
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[.2em] text-neutral-400">
            Admin / Knowledge base
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-.06em] sm:text-5xl">
            Company evidence
          </h1>
          <p className="mt-3 text-sm text-neutral-500">
            Your source of truth for every tender assessment.
          </p>
        </div>
        <div className="rounded-full border border-neutral-200 bg-white px-5 py-3 text-xs font-semibold">
          Active version {version || '—'}
        </div>
      </div>
      {error && (
        <div
          role="alert"
          className="mt-6 flex gap-3 rounded-xl border border-neutral-200 bg-white p-4 text-sm"
        >
          <AlertCircle size={18} />
          {error}
        </div>
      )}
      <div className="mt-10 grid gap-6 lg:grid-cols-[1.25fr_.75fr]">
        <div className="overflow-hidden rounded-[24px] border border-neutral-200 bg-white">
          <div className="flex items-center justify-between border-b border-neutral-100 p-6">
            <div>
              <h2 className="text-lg font-semibold">Document inventory</h2>
              <p className="mt-1 text-xs text-neutral-400">
                {docs.length} active or draft sources
              </p>
            </div>
            <Database size={19} />
          </div>
          {docs.length ? (
            docs.map((d) => (
              <div
                key={d._id}
                className="flex items-center gap-4 border-b border-neutral-100 px-6 py-5 last:border-0"
              >
                <span className="grid size-10 place-items-center rounded-xl bg-neutral-100">
                  <FileText size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{d.filename}</p>
                  <p className="mt-1 text-xs text-neutral-400">
                    {d.typeLabel} · {(d.size / 1024).toFixed(0)} KB ·{' '}
                    {new Date(d.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span className="rounded-full bg-neutral-100 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider">
                  {d.status}
                </span>
                <button
                  title="Remove"
                  onClick={() => remove(d._id)}
                  className="p-2 text-neutral-400 hover:text-black"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          ) : (
            <p className="p-10 text-sm text-neutral-400">
              No company documents uploaded.
            </p>
          )}
        </div>
        <div className="space-y-6">
          <div className="rounded-[24px] border border-neutral-200 bg-white p-7">
            <FileUp size={22} />
            <h2 className="mt-5 text-lg font-semibold">Add evidence</h2>
            <p className="mt-2 text-xs leading-5 text-neutral-500">
              Audited accounts, certificates, incorporation records, past
              projects and other proof.
            </p>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="mt-6 w-full rounded-xl border border-neutral-200 p-3 text-sm"
            >
              <option>Company evidence</option>
              <option>Financial statement</option>
              <option>Certification</option>
              <option>Past project</option>
              <option>Statutory record</option>
              <option>Policy or declaration</option>
            </select>
            <input
              type="file"
              accept=".pdf,.docx"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="mt-4 w-full text-xs file:mr-3 file:rounded-full file:border-0 file:bg-neutral-100 file:px-4 file:py-2 file:text-xs file:font-semibold"
            />
            <button
              disabled={!file || busy}
              onClick={upload}
              className="mt-5 w-full rounded-full bg-neutral-950 px-5 py-3 text-xs font-semibold text-white disabled:opacity-40"
            >
              Upload document
            </button>
          </div>
          <div className="rounded-[24px] bg-neutral-950 p-7 text-white">
            <RefreshCw size={22} />
            <h2 className="mt-5 text-lg font-semibold">Run Extract Engine</h2>
            <p className="mt-2 text-xs leading-6 text-neutral-400">
              Build a versioned semantic and keyword index from the current
              document set. The old version stays active until validation
              succeeds.
            </p>
            <button
              disabled={busy || !docs.length}
              onClick={build}
              className="mt-6 w-full rounded-full bg-white px-5 py-3 text-xs font-semibold text-neutral-950 disabled:opacity-50"
            >
              {busy ? 'Working…' : 'Build and publish'}
            </button>
          </div>
        </div>
      </div>
      <section className="mt-12">
        <h2 className="text-xl font-semibold tracking-tight">
          Publishing history
        </h2>
        <div className="mt-5 overflow-hidden rounded-[24px] border border-neutral-200 bg-white">
          {builds.length ? (
            builds.map((b) => (
              <div
                key={b._id}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-6 py-5 last:border-0"
              >
                <div className="flex items-center gap-4">
                  <span className="grid size-9 place-items-center rounded-full bg-neutral-100">
                    <CheckCircle2 size={16} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">Version {b.version}</p>
                    <p className="mt-1 text-xs text-neutral-400">
                      {b.status} · {b.progress}%{b.error ? ` · ${b.error}` : ''}
                    </p>
                    {Boolean(b.warnings?.length) && (
                      <p className="mt-1 text-xs text-neutral-500">
                        {b.warnings?.length} quality warnings
                      </p>
                    )}
                  </div>
                </div>
                {b.status === 'published' && b.version !== version && (
                  <button
                    onClick={() => rollback(b.version)}
                    className="text-xs font-semibold underline"
                  >
                    Restore version
                  </button>
                )}
              </div>
            ))
          ) : (
            <p className="p-8 text-sm text-neutral-400">
              No published versions yet.
            </p>
          )}
        </div>
      </section>
    </>
  );
}
