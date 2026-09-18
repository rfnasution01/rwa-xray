import {
  ArrowDownRight,
  ArrowRight,
  DatabaseZap,
  Layers3,
  ShieldCheck,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

import { GuidedDemo } from "@/components/guided-demo";
import {
  MotionArticle,
  MotionFloat,
  MotionItem,
  MotionStagger,
} from "@/components/landing-motion";
import { SiteHeader } from "@/components/site-header";

const principles = [
  {
    icon: DatabaseZap,
    title: "Real market data",
    body: "Observed and normalized RWA activity.",
  },
  {
    icon: Layers3,
    title: "Transparent methodology",
    body: "Clearly defined signals, assumptions, and limits.",
  },
  {
    icon: ShieldCheck,
    title: "Evidence before score",
    body: "See the data that drives every assessment.",
  },
];

export default function Home() {
  return (
    <main className="landing-shell min-h-screen overflow-hidden bg-[#02090b] text-[#e9f5f4]">
      <SiteHeader variant="landing" />

      <section className="fx-hero" aria-labelledby="landing-title">
        <div className="fx-hero-grid" aria-hidden="true" />
        <div className="fx-hero-glow" aria-hidden="true" />
        <div className="relative mx-auto grid min-h-[620px] max-w-[1600px] items-center px-5 py-14 sm:px-8 lg:grid-cols-[0.92fr_1.08fr] lg:px-14 lg:py-20">
          <MotionStagger className="relative z-10 max-w-3xl lg:pb-10">
            <MotionItem>
              <p className="fx-kicker">
                Institutional intelligence for a tokenized world
              </p>
            </MotionItem>
            <MotionItem>
              <h1
                id="landing-title"
                className="mt-6 text-[clamp(3.25rem,6vw,6.75rem)] leading-[0.94] font-medium tracking-[-0.065em] text-[#f1f5f2]"
              >
                Can I actually <span className="fx-gradient-text">exit</span>
                <br />
                this position?
              </h1>
            </MotionItem>
            <MotionItem>
              <p className="mt-7 max-w-2xl text-base leading-7 text-[#a2b9ba] sm:text-lg sm:leading-8">
                Stress-test any tokenized real-world asset against observed
                market activity, concentration risk, and evidence
                coverage—before you commit capital.
              </p>
            </MotionItem>
            <MotionItem>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <a className="fx-button-primary" href="#demo">
                  Run guided scenario
                  <ArrowDownRight className="size-4" aria-hidden="true" />
                </a>
                <Link className="fx-button-secondary" href="/assets">
                  Open Explorer
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
            </MotionItem>
            <MotionItem>
              <p className="mt-6 font-mono text-[10px] tracking-[0.17em] text-[#5f8587] uppercase">
                Real observations · USD scenarios · No account required
              </p>
            </MotionItem>
          </MotionStagger>

          <MotionFloat className="relative -mx-10 mt-10 min-h-[360px] lg:absolute lg:top-0 lg:right-[-7%] lg:bottom-0 lg:mt-0 lg:w-[64%]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(36,235,229,0.14),transparent_58%)]" />
            <Image
              src="/illustrations/rwa-market-globe.webp"
              alt="Connected global real-world asset markets visualized as a digital globe"
              fill
              priority
              sizes="(max-width: 1024px) 110vw, 64vw"
              className="object-contain object-center lg:object-right"
            />
          </MotionFloat>
        </div>
      </section>

      <section
        className="border-y border-[#12383a] bg-[#031012]/90"
        aria-label="Product principles"
      >
        <div className="mx-auto grid max-w-[1600px] md:grid-cols-3">
          {principles.map(({ icon: Icon, title, body }, index) => (
            <MotionArticle
              key={title}
              delay={index * 0.1}
              className="fx-principle-card group flex min-h-28 items-center gap-5 border-[#12383a] px-6 py-6 md:border-r md:last:border-r-0 lg:px-12"
            >
              <span className="grid size-11 shrink-0 place-items-center border border-[#236467] text-[#62f5ee] transition group-hover:bg-[#0a2c2e]">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[9px] tracking-widest text-[#447477]">
                    0{index + 1}
                  </span>
                  <h2 className="text-sm font-semibold tracking-wide text-[#e7f2f0]">
                    {title}
                  </h2>
                </div>
                <p className="mt-1 text-xs leading-5 text-[#78999b]">{body}</p>
              </div>
            </MotionArticle>
          ))}
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
      className="mx-auto max-w-[1600px] px-5 py-12 sm:px-8 lg:px-14"
      aria-label="Loading guided scenario"
    >
      <div className="fx-skeleton min-h-[560px]">
        <div className="fx-skeleton-header">
          <span className="flex items-center gap-3">
            <span className="h-px w-8 bg-[#4edfd8]" />
            Initializing scenario terminal
          </span>
          <span className="fx-skeleton-status">Loading</span>
        </div>
        <div className="grid gap-px bg-[#123537] md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="min-h-[510px] bg-[#041113] p-7">
              <div className="fx-skeleton-line h-2.5 w-36" />
              <div className="fx-skeleton-line mt-8 h-10 w-full" />
              <div className="fx-skeleton-line mt-3 h-10 w-4/5" />
              <div className="fx-skeleton-line mt-10 h-2.5 w-24" />
              <div className="fx-skeleton-cell mt-5 h-24" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
