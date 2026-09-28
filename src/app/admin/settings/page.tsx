'use client';
import { useEffect, useState } from 'react';
import { SlidersHorizontal, AlertCircle, CheckCircle2 } from 'lucide-react';
export default function Settings() {
  const [model, setModel] = useState(''),
    [options, setOptions] = useState<string[]>([]),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState('');
  useEffect(() => {
    fetch('/api/admin/ai-settings')
      .then((r) => r.json())
      .then((x) => {
        setModel(x.model || '');
        setOptions(x.options || []);
      });
  }, []);
  async function save() {
    setBusy(true);
    setMessage('');
    const r = await fetch('/api/admin/ai-settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model }),
    });
    const x = await r.json();
    setMessage(
      r.ok ? 'Model setting saved' : x.error?.message || 'Could not save',
    );
    setBusy(false);
  }
  return (
    <div className="max-w-4xl">
      <p className="text-[11px] font-bold uppercase tracking-[.2em] text-neutral-400">
        Admin / Settings
      </p>
      <h1 className="mt-3 text-4xl font-semibold tracking-[-.06em] sm:text-5xl">
        AI settings
      </h1>
      <p className="mt-3 text-sm text-neutral-500">
        Configure the model used for new tender analyses. Existing reports
        retain their pinned model.
      </p>
      <div className="mt-10 rounded-[26px] border border-neutral-200 bg-white p-7 sm:p-9">
        <SlidersHorizontal size={22} />
        <h2 className="mt-6 text-xl font-semibold">Reasoning model</h2>
        <p className="mt-2 text-sm leading-6 text-neutral-500">
          Single-model mode. Availability is checked against your Groq account
          before a change is saved.
        </p>
        <label className="mt-7 block text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Model ID
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="mt-3 w-full rounded-xl border border-neutral-200 bg-white px-4 py-4 text-sm font-medium normal-case tracking-normal text-black"
          >
            {options.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        {message && (
          <div className="mt-5 flex items-center gap-2 rounded-xl bg-neutral-100 p-4 text-sm">
            {message === 'Model setting saved' ? (
              <CheckCircle2 size={17} />
            ) : (
              <AlertCircle size={17} />
            )}{' '}
            {message}
          </div>
        )}
        <button
          onClick={save}
          disabled={busy || !model}
          className="mt-7 rounded-full bg-neutral-950 px-6 py-3 text-xs font-semibold text-white disabled:opacity-40"
        >
          {busy ? 'Checking availability…' : 'Save settings'}
        </button>
      </div>
      <p className="mt-6 text-xs leading-6 text-neutral-400">
        Auto routing and alternate-model benchmarks require deployment-specific
        verification before use.
      </p>
    </div>
  );
}
