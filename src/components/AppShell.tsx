'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Brand } from './Brand';
import {
  LayoutDashboard,
  FileText,
  Database,
  LogOut,
  ChevronRight,
  ShieldCheck,
  LoaderCircle,
  SlidersHorizontal,
} from 'lucide-react';
type Status = {
  activeKbVersion?: number;
  maintenance?: { progress: string } | null;
  lastBuildError?: string;
  ready?: { database: boolean; groq: boolean; embeddings: boolean };
};
export function AppShell({
  children,
  role,
  name,
  adminEntitled = false,
}: {
  children: React.ReactNode;
  role: 'admin' | 'general';
  name: string;
  adminEntitled?: boolean;
}) {
  const pathname = usePathname(),
    router = useRouter(),
    [status, setStatus] = useState<Status>({});
  useEffect(() => {
    let live = true;
    async function poll() {
      try {
        const r = await fetch('/api/system/status', { cache: 'no-store' });
        const x = await r.json();
        if (live) setStatus(x);
      } catch {}
    }
    poll();
    const interval = setInterval(poll, 4000);
    return () => {
      live = false;
      clearInterval(interval);
    };
  }, []);
  async function signout() {
    await fetch('/api/auth/signout', { method: 'POST' });
    router.push('/');
    router.refresh();
  }
  const links =
    role === 'admin'
      ? [
          { href: '/admin', label: 'Overview', icon: LayoutDashboard },
          { href: '/admin/knowledge', label: 'Knowledge base', icon: Database },
          { href: '/admin/analyses', label: 'All analyses', icon: FileText },
          {
            href: '/admin/settings',
            label: 'AI settings',
            icon: SlidersHorizontal,
          },
        ]
      : [
          { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
          { href: '/dashboard/new', label: 'New analysis', icon: FileText },
        ];
  return (
    <div className="min-h-screen bg-stone-50 text-neutral-950 lg:flex">
      <aside className="sticky top-0 hidden h-screen w-[272px] shrink-0 flex-col border-r border-stone-200 bg-[#fdfcfb] px-5 py-7 lg:flex">
        <div className="px-2">
          <Brand />
        </div>
        <div className="mt-14 px-3 text-[10px] font-bold uppercase tracking-[0.24em] text-stone-400">
          Workspace
        </div>
        <nav aria-label="Workspace" className="mt-4 space-y-1.5">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? 'page' : undefined}
              className={`group flex items-center gap-3 rounded-2xl px-3.5 py-3.5 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 ${pathname === href ? 'bg-neutral-950 text-white shadow-[0_10px_24px_-15px_rgba(0,0,0,.7)]' : 'text-neutral-500 hover:translate-x-0.5 hover:bg-stone-100 hover:text-neutral-950'}`}
            >
              <Icon size={17} />
              {label}
              {pathname === href && (
                <ChevronRight size={14} className="ml-auto opacity-50" />
              )}
            </Link>
          ))}
        </nav>
        <div className="mt-auto">
          <div className="rounded-[22px] border border-stone-200 bg-stone-50 p-4 shadow-[0_10px_30px_-28px_rgba(0,0,0,.5)]">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <ShieldCheck size={15} /> Knowledge status
            </div>
            <p className="mt-2 text-xs leading-5 text-neutral-500">
              {status.maintenance
                ? status.maintenance.progress
                : status.activeKbVersion
                  ? `Version ${status.activeKbVersion} active`
                  : 'Awaiting first publish'}
            </p>
          </div>
          {adminEntitled && (
            <Link
              href="/choose-role"
              className="mt-5 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-neutral-500 transition hover:bg-stone-100 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950"
            >
              <ShieldCheck size={16} /> Switch role
            </Link>
          )}
          <button
            onClick={signout}
            className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-neutral-500 transition hover:bg-stone-100 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-stone-200/80 bg-stone-50/90 px-5 backdrop-blur-xl lg:px-12">
          <div className="lg:hidden">
            <Brand />
          </div>
          <div className="hidden items-center gap-3 lg:flex">
            <span className="size-1.5 rounded-full bg-neutral-950" />
            <span className="text-[10px] font-bold uppercase tracking-[0.23em] text-neutral-500">
              {role === 'admin'
                ? 'Administrator workspace'
                : 'Decision workspace'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-neutral-500 sm:block">
              {name}
            </span>
            <span className="grid size-9 place-items-center rounded-full border-[3px] border-white bg-neutral-950 text-xs font-semibold text-white shadow-sm">
              {name.slice(0, 1).toUpperCase()}
            </span>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto border-b border-stone-200 bg-stone-50 px-5 py-2 lg:hidden">
          {links.map((x) => (
            <Link
              key={x.href}
              href={x.href}
              aria-current={pathname === x.href ? 'page' : undefined}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition ${pathname === x.href ? 'bg-neutral-950 text-white' : 'text-neutral-600 hover:bg-stone-200'}`}
            >
              {x.label}
            </Link>
          ))}
          {adminEntitled && (
            <Link
              href="/choose-role"
              className="whitespace-nowrap px-3 py-2 text-sm"
            >
              Switch role
            </Link>
          )}
          <button onClick={signout} className="ml-auto text-sm">
            Sign out
          </button>
        </div>
        <main className="mx-auto max-w-[1480px] px-5 py-9 sm:px-8 lg:px-12 lg:py-12">
          {status.lastBuildError && (
            <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-4 text-xs text-neutral-600">
              Knowledge build failed: {status.lastBuildError}. The last
              published version remains active.
            </div>
          )}
          {children}
        </main>
      </div>
      {status.maintenance && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-white/65 px-5 backdrop-blur-lg">
          <div className="w-full max-w-md rounded-[28px] border border-neutral-200 bg-white p-9 text-center shadow-2xl">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-neutral-950 text-white">
              <LoaderCircle className="animate-spin" />
            </div>
            <h2 className="mt-6 text-2xl font-semibold tracking-tight">
              Knowledge base processing
            </h2>
            <p className="mt-3 text-sm text-neutral-500">
              {status.maintenance.progress}
            </p>
            <p className="mt-6 text-xs text-neutral-400">
              This screen will update automatically.
            </p>
            <button
              onClick={signout}
              className="mt-6 text-xs font-semibold underline"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
