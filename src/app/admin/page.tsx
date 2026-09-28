'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  Database,
  FileText,
  Activity,
  ArrowRight,
} from 'lucide-react';
type Overview = {
  documents: number;
  builds: { version: number; status: string; createdAt: string }[];
  analyses: {
    id: string;
    title: string;
    ownerEmail: string;
    decision?: string;
    status: string;
    createdAt: string;
  }[];
  usage: {
    _id: string;
    inputTokens: number;
    outputTokens: number;
    calls: number;
  }[];
};
export default function Admin() {
  const [data, setData] = useState<Overview | null>(null),
    [status, setStatus] = useState<{ activeKbVersion?: number } | null>(null);
  useEffect(() => {
    fetch('/api/admin/overview')
      .then((r) => r.json())
      .then(setData);
    fetch('/api/system/status')
      .then((r) => r.json())
      .then(setStatus);
  }, []);
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[.2em] text-neutral-400">
            Admin / Overview
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-.06em] sm:text-5xl">
            Control center
          </h1>
          <p className="mt-3 text-sm text-neutral-500">
            Evidence quality, analysis activity, and service usage at a glance.
          </p>
        </div>
        <Link
          href="/admin/knowledge"
          className="inline-flex items-center gap-2 rounded-full bg-neutral-950 px-5 py-3 text-sm font-semibold text-white"
        >
          Manage knowledge <ArrowUpRight size={17} />
        </Link>
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [
            Database,
            'Active index',
            status?.activeKbVersion ? `v${status.activeKbVersion}` : '—',
          ],
          [FileText, 'Documents', data?.documents ?? '—'],
          [Activity, 'Analyses', data?.analyses?.length ?? '—'],
          [
            ArrowRight,
            'Groq calls',
            data?.usage?.reduce((n, x) => n + x.calls, 0) ?? '—',
          ],
        ].map(([Icon, label, value]) => {
          const I = Icon as typeof Database;
          return (
            <div
              key={String(label)}
              className="rounded-[23px] border border-neutral-200 bg-white p-6"
            >
              <I size={18} className="text-neutral-500" />
              <div className="mt-8 text-4xl font-semibold tracking-[-.06em]">
                {String(value)}
              </div>
              <div className="mt-2 text-xs text-neutral-500">
                {String(label)}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-12 grid gap-6 lg:grid-cols-[1.3fr_.7fr]">
        <div className="overflow-hidden rounded-[24px] border border-neutral-200 bg-white">
          <div className="flex items-center justify-between border-b border-neutral-100 p-6">
            <div>
              <h2 className="text-lg font-semibold">Recent analyses</h2>
              <p className="mt-1 text-xs text-neutral-400">
                Across the organization
              </p>
            </div>
            <Link href="/admin/analyses" className="text-xs font-semibold">
              View all →
            </Link>
          </div>
          {data?.analyses?.slice(0, 5).map((x) => (
            <Link
              key={x.id}
              href={`/report/${x.id}`}
              className="flex items-center justify-between gap-4 border-b border-neutral-100 px-6 py-4 last:border-0 hover:bg-neutral-50"
            >
              <div>
                <p className="text-sm font-semibold">{x.title}</p>
                <p className="mt-1 text-xs text-neutral-400">{x.ownerEmail}</p>
              </div>
              <span className="text-xs text-neutral-500">
                {x.decision || x.status}
              </span>
            </Link>
          ))}
          {!data?.analyses?.length && (
            <p className="p-8 text-sm text-neutral-400">No analyses yet.</p>
          )}
        </div>
        <div className="rounded-[24px] bg-neutral-950 p-7 text-white">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-neutral-500">
            Extract Engine
          </p>
          <h2 className="mt-10 text-2xl font-semibold tracking-tight">
            Keep the evidence current.
          </h2>
          <p className="mt-3 text-sm leading-6 text-neutral-400">
            Upload company records, then publish a new version after extraction
            and validation.
          </p>
          <Link
            href="/admin/knowledge"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-xs font-semibold text-black"
          >
            Open knowledge base <ArrowUpRight size={15} />
          </Link>
        </div>
      </div>
      <div className="mt-12 rounded-[24px] border border-neutral-200 bg-white p-7">
        <h2 className="text-lg font-semibold">Model usage</h2>
        <div className="mt-5 divide-y divide-neutral-100">
          {data?.usage?.map((x) => (
            <div
              key={x._id}
              className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm"
            >
              <span className="font-medium">{x._id}</span>
              <span className="text-neutral-500">
                {x.calls} calls · {x.inputTokens + x.outputTokens} tokens
              </span>
            </div>
          ))}
          {!data?.usage?.length && (
            <p className="py-5 text-sm text-neutral-400">
              Usage appears after the first analysis.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
