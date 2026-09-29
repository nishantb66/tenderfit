'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Brand } from '@/components/Brand';
import { ArrowUpRight, UserRound, Shield } from 'lucide-react';
export function RoleChoice({ name }: { name: string }) {
  const router = useRouter(),
    [busy, setBusy] = useState(false);
  async function choose(role: 'general' | 'admin') {
    setBusy(true);
    const r = await fetch('/api/auth/role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    if (r.ok) {
      router.push(role === 'admin' ? '/admin' : '/dashboard');
      router.refresh();
    } else setBusy(false);
  }
  return (
    <div className="relative min-h-screen overflow-hidden bg-neutral-950 p-6 text-white sm:p-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 -top-64 size-[700px] rounded-full border border-white/10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-44 size-[500px] rounded-full border border-white/10"
      />
      <div className="relative">
        <Brand light />
      </div>
      <div className="relative mx-auto flex min-h-[80vh] max-w-4xl flex-col justify-center">
        <p className="text-xs font-semibold uppercase tracking-[.25em] text-neutral-500">
          Select your workspace
        </p>
        <h1 className="mt-5 text-5xl font-semibold tracking-[-.07em] sm:text-7xl">
          Welcome back,
          <br />
          <span className="font-serif italic font-normal">
            {name.split(' ')[0]}.
          </span>
        </h1>
        <p className="mt-6 text-neutral-400">
          Choose how you want to work this session.
        </p>
        <div className="mt-12 grid gap-4 md:grid-cols-2">
          <button
            disabled={busy}
            onClick={() => choose('general')}
            className="group rounded-[30px] border border-neutral-700 bg-neutral-900 p-8 text-left transition-all duration-200 hover:-translate-y-1 hover:border-neutral-500 hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50 disabled:hover:translate-y-0"
          >
            <UserRound size={27} />
            <div className="mt-16 flex items-end justify-between">
              <div>
                <div className="text-2xl font-semibold tracking-tight">
                  General user
                </div>
                <p className="mt-2 text-sm text-neutral-400">
                  Submit tenders and review your own decisions.
                </p>
              </div>
              <ArrowUpRight className="group-hover:-translate-y-1 group-hover:translate-x-1 transition" />
            </div>
          </button>
          <button
            disabled={busy}
            onClick={() => choose('admin')}
            className="group rounded-[30px] border border-neutral-700 bg-white p-8 text-left text-neutral-950 transition-all duration-200 hover:-translate-y-1 hover:bg-stone-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50 disabled:hover:translate-y-0"
          >
            <Shield size={27} />
            <div className="mt-16 flex items-end justify-between">
              <div>
                <div className="text-2xl font-semibold tracking-tight">
                  Admin login
                </div>
                <p className="mt-2 text-sm text-neutral-500">
                  Manage evidence, models, builds and usage.
                </p>
              </div>
              <ArrowUpRight className="group-hover:-translate-y-1 group-hover:translate-x-1 transition" />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
