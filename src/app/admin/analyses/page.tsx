'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowUpRight, Search } from 'lucide-react';
type Row = {
  id: string;
  title: string;
  ownerEmail: string;
  status: string;
  decision?: string;
  kbVersion: number;
  model: string;
  createdAt: string;
  usage?: { tokens: number; calls: number };
};
export default function AdminAnalyses() {
  const [rows, setRows] = useState<Row[]>([]),
    [query, setQuery] = useState('');
  useEffect(() => {
    fetch('/api/admin/overview')
      .then((r) => r.json())
      .then((x) => setRows(x.analyses || []));
  }, []);
  return (
    <>
      <p className="text-[11px] font-bold uppercase tracking-[.2em] text-neutral-400">
        Admin / Analyses
      </p>
      <h1 className="mt-3 text-4xl font-semibold tracking-[-.06em] sm:text-5xl">
        All tenders
      </h1>
      <p className="mt-3 text-sm text-neutral-500">
        Organization-wide analysis activity and outcomes.
      </p>
      <div className="relative mt-9 max-w-xs">
        <Search
          size={16}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name or uploader"
          className="w-full rounded-full border border-neutral-200 bg-white py-3 pl-11 pr-4 text-sm"
        />
      </div>
      <div className="mt-6 overflow-x-auto rounded-[24px] border border-neutral-200 bg-white">
        <table className="w-full min-w-[750px] text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-100 text-[10px] uppercase tracking-widest text-neutral-400">
              <th className="px-6 py-5">Tender</th>
              <th className="px-6 py-5">Uploader</th>
              <th className="px-6 py-5">Outcome</th>
              <th className="px-6 py-5">KB / Model</th>
              <th className="px-6 py-5">Tokens</th>
              <th className="px-6 py-5">Submitted</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows
              .filter((x) =>
                `${x.title} ${x.ownerEmail}`
                  .toLowerCase()
                  .includes(query.toLowerCase()),
              )
              .map((x) => (
                <tr
                  key={x.id}
                  className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50"
                >
                  <td className="px-6 py-5 font-semibold">{x.title}</td>
                  <td className="px-6 py-5 text-neutral-500">{x.ownerEmail}</td>
                  <td className="px-6 py-5">
                    <span className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs">
                      {x.decision || x.status}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-xs text-neutral-500">
                    v{x.kbVersion} · {x.model}
                  </td>
                  <td className="px-6 py-5 text-xs text-neutral-500">
                    {x.usage?.tokens || 0}
                  </td>
                  <td className="px-6 py-5 text-xs text-neutral-500">
                    {new Date(x.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-5">
                    <Link href={`/report/${x.id}`}>
                      <ArrowUpRight size={16} />
                    </Link>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {!rows.length && (
          <p className="p-8 text-sm text-neutral-400">No analyses yet.</p>
        )}
      </div>
    </>
  );
}
