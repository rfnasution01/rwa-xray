import { ArrowDown, DatabaseZap, ScanSearch, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { GuidedDemo } from "@/components/guided-demo";
import { SiteHeader } from "@/components/site-header";

const principles = [
  {
    icon: DatabaseZap,
    title: "Real observations only",
    body: "Live CoinMarketCap data with a labeled real-cache fallback. Never an unlabeled mock.",
  },
  {
    icon: ScanSearch,
    title: "Capacity, not promises",
    body: "Explore transparent volume-participation scenarios rather than guaranteed liquidity claims.",
  },
  {
    icon: ShieldCheck,
    title: "Evidence before score",
    body: "Missing pairs, stale timestamps, and issuer gaps stay visible instead of becoming zero.",
  },
];

export default function Home() {
  return (
    <main className="bg-background text-foreground min-h-screen">
      <SiteHeader />
      <section className="hero-grid border-b border-slate-200 dark:border-slate-800">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.12fr_0.88fr] lg:px-8 lg:py-24">
          <div className="self-center">
            <p className="eyebrow">RWA market capacity intelligence</p>
            <h1 className="mt-5 max-w-4xl text-5xl font-semibold tracking-[-0.055em] text-balance sm:text-6xl lg:text-7xl">
              Can I actually{" "}
              <span className="text-blue-600 dark:text-blue-400">exit?</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
              Stress-test a position against observed RWA volume, inspect
              concentration risk, and see exactly where the evidence stops.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a className="button-primary" href="#demo">
                Run guided scenario{" "}
                <ArrowDown className="size-4" aria-hidden="true" />
              </a>
              <Link className="button-secondary" href="/assets">
                Open Explorer
              </Link>
            </div>
            <p className="mt-5 text-xs text-slate-500 dark:text-slate-400">
              Built for treasury and risk analysis · USD scenarios · No account
              required
            </p>
          </div>

          <div className="grid gap-3 self-center">
            {principles.map(({ icon: Icon, title, body }, index) => (
              <article
                key={title}
                className="group rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/90"
              >
                <div className="flex gap-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-slate-400">
                        0{index + 1}
                      </span>
                      <h2 className="font-semibold">{title}</h2>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
                      {body}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <Suspense fallback={<DemoPageFallback />}>
        <GuidedDemo />
      </Suspense>
    </main>
  );
}

function DemoPageFallback() {
  return (
    <section
      className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8"
      aria-label="Loading guided scenario"
    >
      <div className="h-96 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" />
    </section>
  );
}
