import Link from 'next/link';
import { Brand } from '@/components/Brand';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
export default function Sample() {
  return (
    <div className="min-h-screen bg-stone-50">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Brand />
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold"
        >
          <ArrowLeft size={15} /> Home
        </Link>
      </header>
      <main className="mx-auto max-w-6xl px-6 pb-20 pt-12">
        <div className="relative overflow-hidden rounded-[34px] bg-neutral-950 p-8 text-white shadow-[0_28px_60px_-45px_rgba(0,0,0,.75)] sm:p-12">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-40 size-96 rounded-full border border-white/10"
          />
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-neutral-500">
            Fictional sample report
          </p>
          <h1 className="mt-5 text-4xl font-semibold tracking-[-.06em] sm:text-6xl">
            Municipal Infrastructure RFP
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-neutral-400">
            Illustrative content only. No real company or tender data is shown
            here.
          </p>
          <div className="mt-10 inline-flex rounded-full bg-white px-4 py-2 text-xs font-semibold text-black">
            Needs review
          </div>
        </div>
        <div className="mt-7 grid gap-4 sm:grid-cols-3">
          {[
            ['11', 'Supported'],
            ['5', 'Needs review'],
            ['2', 'Not satisfied'],
          ].map(([n, label]) => (
            <div
              key={label}
              className="rounded-[24px] border border-stone-200 bg-white p-7 shadow-[0_18px_50px_-44px_rgba(0,0,0,.45)]"
            >
              <div className="text-4xl font-semibold">{n}</div>
              <div className="mt-2 text-xs text-neutral-500">{label}</div>
            </div>
          ))}
        </div>
        <div className="mt-8 rounded-[28px] border border-stone-200 bg-white p-8 shadow-[0_18px_50px_-44px_rgba(0,0,0,.45)]">
          <h2 className="text-xl font-semibold">Example evidence trail</h2>
          <p className="mt-5 text-sm font-semibold">
            Average annual turnover of at least ₹5 crore for FY23–FY25
          </p>
          <p className="mt-3 text-sm leading-6 text-neutral-500">
            Needs verification. FY24 and FY25 audited statements were found, but
            FY23 is missing. The average cannot be confirmed from available
            evidence.
          </p>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl bg-neutral-100 p-5 text-xs leading-6">
              <b>Tender source · page 13, section 4.4</b>
              <br />
              “Average annual turnover of at least INR 5 crore...”
            </div>
            <div className="rounded-xl bg-neutral-100 p-5 text-xs leading-6">
              <b>Company source · audited accounts, page 5</b>
              <br />
              FY24 and FY25 values present; FY23 unavailable.
            </div>
          </div>
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
          <p className="max-w-xl text-xs leading-6 text-neutral-500">
            TenderFit flags missing proof as a review item. Final eligibility
            and bid submission remain human decisions.
          </p>
          <a
            href="/api/google/start"
            className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-3 text-xs font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2"
          >
            Open your workspace <ArrowUpRight size={15} />
          </a>
        </div>
      </main>
    </div>
  );
}
