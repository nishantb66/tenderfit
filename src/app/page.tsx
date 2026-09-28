import Link from 'next/link';
import {
  ArrowUpRight,
  ArrowRight,
  Check,
  FileSearch,
  Layers3,
  LockKeyhole,
  MoveUpRight,
} from 'lucide-react';
import { Brand } from '@/components/Brand';
export default function Home() {
  return (
    <div className="min-h-screen bg-[#f8f8f6]">
      <header className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-6 lg:px-12">
        <Brand />
        <nav className="hidden items-center gap-9 text-sm font-medium text-neutral-600 md:flex">
          <a href="#how" className="hover:text-black">
            How it works
          </a>
          <a href="#principles" className="hover:text-black">
            Principles
          </a>
          <Link href="/sample" className="hover:text-black">
            Sample report
          </Link>
        </nav>
        <a
          href="/api/google/start"
          className="inline-flex items-center gap-2 rounded-full bg-neutral-950 px-5 py-3 text-xs font-semibold text-white transition hover:bg-neutral-700"
        >
          Enter workspace <ArrowUpRight size={15} />
        </a>
      </header>
      <main>
        <section className="mx-auto grid max-w-[1440px] gap-10 px-6 pb-20 pt-16 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:px-12 lg:pb-28 lg:pt-24">
          <div>
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-[0.17em] text-neutral-600">
              <span className="size-1.5 rounded-full bg-neutral-950" />
              Evidence-led bid intelligence
            </div>
            <h1 className="max-w-3xl text-[clamp(3.8rem,7vw,7.6rem)] font-semibold leading-[.94] tracking-[-.085em]">
              Decide with
              <br />
              <span className="font-serif italic font-normal tracking-[-.075em]">
                the evidence.
              </span>
            </h1>
            <p className="mt-8 max-w-lg text-lg leading-8 text-neutral-500">
              Know whether a tender fits before you commit. TenderFit connects
              every requirement to the company proof behind your decision.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <a
                href="/api/google/start"
                className="inline-flex items-center gap-3 rounded-full bg-neutral-950 px-6 py-4 text-sm font-semibold text-white hover:bg-neutral-700"
              >
                Continue with Google <ArrowRight size={17} />
              </a>
              <Link
                href="/sample"
                className="inline-flex items-center gap-2 px-3 py-4 text-sm font-semibold text-neutral-800"
              >
                Explore a sample report <MoveUpRight size={16} />
              </Link>
            </div>
            <div className="mt-16 flex items-center gap-6 border-t border-neutral-200 pt-6 text-[11px] font-medium uppercase tracking-[0.15em] text-neutral-400">
              <span>01 / Extract</span>
              <span>02 / Verify</span>
              <span>03 / Decide</span>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-[32px] bg-[#e8e8e5] p-4 shadow-[0_30px_80px_-40px_rgba(0,0,0,.35)] sm:p-8">
            <div className="absolute -right-12 -top-12 size-56 rounded-full border border-neutral-300" />
            <div className="absolute -right-24 -top-24 size-80 rounded-full border border-neutral-300" />
            <div className="relative rounded-[23px] border border-neutral-200 bg-white p-6 shadow-xl sm:p-8">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[.2em] text-neutral-400">
                    TenderFit / Assessment
                  </div>
                  <h2 className="mt-3 text-xl font-semibold tracking-tight">
                    Municipal Infrastructure RFP
                  </h2>
                  <p className="mt-1 text-xs text-neutral-400">
                    Illustrative sample · 18 requirements
                  </p>
                </div>
                <span className="grid size-10 place-items-center rounded-xl bg-neutral-100">
                  <FileSearch size={19} />
                </span>
              </div>
              <div className="mt-8 grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-neutral-950 p-4 text-white">
                  <div className="text-3xl font-semibold">11</div>
                  <div className="mt-1 text-[10px] text-neutral-300">
                    Supported
                  </div>
                </div>
                <div className="rounded-xl bg-neutral-100 p-4">
                  <div className="text-3xl font-semibold">05</div>
                  <div className="mt-1 text-[10px] text-neutral-500">
                    Review
                  </div>
                </div>
                <div className="rounded-xl bg-neutral-100 p-4">
                  <div className="text-3xl font-semibold">02</div>
                  <div className="mt-1 text-[10px] text-neutral-500">
                    Blockers
                  </div>
                </div>
              </div>
              <div className="mt-7 flex items-center justify-between border-b border-neutral-100 pb-3 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                <span>Requirement & evidence</span>
                <span>Status</span>
              </div>
              {[
                ['Audited turnover, FY23–25', 'Needs review'],
                ['ISO 27001 certification', 'Supported'],
                ['Three comparable projects', 'Blocker'],
              ].map(([name, state]) => (
                <div
                  key={name}
                  className="flex items-center justify-between gap-3 border-b border-neutral-100 py-4 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid size-6 place-items-center rounded-full bg-neutral-100 text-neutral-600">
                      <Check size={12} />
                    </span>
                    <span className="font-medium">{name}</span>
                  </div>
                  <span className="whitespace-nowrap text-[10px] text-neutral-500">
                    {state}
                  </span>
                </div>
              ))}
              <div className="mt-5 flex items-center justify-between rounded-xl bg-neutral-100 p-4 text-xs">
                <span className="font-medium">
                  Every conclusion links to its source.
                </span>
                <ArrowUpRight size={16} />
              </div>
            </div>
          </div>
        </section>
        <section id="how" className="bg-neutral-950 text-white">
          <div className="mx-auto max-w-[1440px] px-6 py-20 lg:px-12 lg:py-28">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.2em] text-neutral-500">
                  The workflow
                </p>
                <h2 className="mt-4 max-w-2xl text-4xl font-semibold tracking-[-.06em] sm:text-5xl">
                  From tender package
                  <br />
                  to an informed call.
                </h2>
              </div>
              <p className="max-w-sm text-sm leading-7 text-neutral-400">
                Structured assessment, grounded in your own verified company
                records.
              </p>
            </div>
            <div className="mt-16 grid gap-px overflow-hidden rounded-2xl bg-neutral-800 md:grid-cols-3">
              {[
                [
                  FileSearch,
                  '01',
                  'Read the tender',
                  'Extract clauses, amendments, deadlines and submission requests.',
                ],
                [
                  Layers3,
                  '02',
                  'Match the proof',
                  'Search your published company evidence with text and semantic retrieval.',
                ],
                [
                  LockKeyhole,
                  '03',
                  'Make the call',
                  'See what is supported, blocked, or still needs a human check.',
                ],
              ].map(([Icon, n, t, d]) => {
                const I = Icon as typeof FileSearch;
                return (
                  <div key={String(n)} className="bg-neutral-950 p-8">
                    <I size={24} className="text-neutral-400" />
                    <div className="mt-16 text-xs text-neutral-500">
                      {String(n)}
                    </div>
                    <h3 className="mt-3 text-xl font-semibold">{String(t)}</h3>
                    <p className="mt-3 text-sm leading-6 text-neutral-400">
                      {String(d)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
        <section
          id="principles"
          className="mx-auto grid max-w-[1440px] gap-12 px-6 py-24 lg:grid-cols-2 lg:px-12"
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-neutral-400">
              Built for decisions that matter
            </p>
            <h2 className="mt-5 text-4xl font-semibold tracking-[-.06em] sm:text-5xl">
              Clarity is the
              <br />
              <span className="font-serif italic font-normal">
                whole point.
              </span>
            </h2>
          </div>
          <div className="space-y-7 text-sm leading-7 text-neutral-600">
            <p>
              Missing proof is shown as a gap, not treated as a failed
              requirement. Positive and negative findings require source
              citations.
            </p>
            <p>
              Each report records the knowledge base and model versions used, so
              a later document update never rewrites the basis of an earlier
              assessment.
            </p>
            <p className="border-t border-neutral-200 pt-7 text-xs text-neutral-400">
              TenderFit supports a human go / investigate / no-go decision. It
              does not certify legal eligibility or submit a bid.
            </p>
          </div>
        </section>
      </main>
      <footer className="border-t border-neutral-200 px-6 py-8 lg:px-12">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4">
          <Brand />
          <p className="text-xs text-neutral-400">
            Private documents stay in your organization workspace. © 2026
            TenderFit.
          </p>
        </div>
      </footer>
    </div>
  );
}
