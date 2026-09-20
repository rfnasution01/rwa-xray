"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  Calculator,
  CheckCircle2,
  Clock3,
  Database,
  Network,
  Scale,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";

import { TechnicalTerm } from "@/components/technical-term";
import { useState, type KeyboardEvent } from "react";

import { ANALYSIS_CONFIG, METHODOLOGY_VERSION } from "@/domain/analysis/config";

const principles = [
  {
    icon: Database,
    title: "Observed data",
    copy: "Analysis starts with normalized CoinMarketCap RWA data. Cached real data is labeled when stale.",
  },
  {
    icon: Calculator,
    title: "Explicit assumptions",
    copy: "Position size, volume participation, and stress haircut remain visible and reproducible.",
  },
  {
    icon: ShieldCheck,
    title: "Missing ≠ zero",
    copy: "Unavailable evidence stays unavailable, reduces coverage, and is never silently scored as zero.",
  },
];

const assumptions = [
  "Volume participation is a scenario, not guaranteed executable liquidity.",
  "The model does not estimate order-book depth, slippage, fees, gas, or price impact.",
  "Redemption restrictions, market hours, and venue access are outside the capacity formula.",
  "Evidence Coverage measures data completeness—not asset safety or investment quality.",
  "Market Capacity Health is not an investment rating or a buy/sell recommendation.",
];

const healthWeights = [
  ["Observed activity", ANALYSIS_CONFIG.healthWeights.activity],
  ["Diversification", ANALYSIS_CONFIG.healthWeights.diversification],
  ["Price consistency", ANALYSIS_CONFIG.healthWeights.priceConsistency],
  ["Market availability", ANALYSIS_CONFIG.healthWeights.availability],
  ["Data freshness", ANALYSIS_CONFIG.healthWeights.freshness],
] as const;

const evidenceWeights = [
  ["Aggregate quote", ANALYSIS_CONFIG.evidenceWeights.aggregateQuote],
  ["Fresh source timestamp", ANALYSIS_CONFIG.evidenceWeights.freshTimestamp],
  ["Market-pair coverage", ANALYSIS_CONFIG.evidenceWeights.marketPairs],
  ["Token breakdown", ANALYSIS_CONFIG.evidenceWeights.tokenBreakdown],
  ["Issuer mapping", ANALYSIS_CONFIG.evidenceWeights.issuerMapping],
  [
    "Cross-field consistency",
    ANALYSIS_CONFIG.evidenceWeights.crossFieldConsistency,
  ],
] as const;

const freshnessBands = [
  ["≤ 15 min", "Valid for current concentration"],
  ["15–60 min", "Included with evidence penalty"],
  ["> 60 min", "Excluded from current concentration"],
] as const;

const sectionLinks = [
  ["01", "Capacity model", "capacity-model"],
  ["02", "Concentration", "concentration"],
  ["03", "Scores and evidence", "scores"],
  ["04", "Interpretation limits", "limits"],
] as const;

type MethodologyTab = (typeof sectionLinks)[number][2];

export function MethodologyView() {
  const reduceMotion = useReducedMotion();
  const [activeTab, setActiveTab] = useState<MethodologyTab>("capacity-model");

  function handleTabKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    currentTab: MethodologyTab,
  ) {
    const currentIndex = sectionLinks.findIndex(
      ([, , id]) => id === currentTab,
    );
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight")
      nextIndex = (currentIndex + 1) % sectionLinks.length;
    if (event.key === "ArrowLeft")
      nextIndex =
        (currentIndex - 1 + sectionLinks.length) % sectionLinks.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = sectionLinks.length - 1;
    if (nextIndex === null) return;

    event.preventDefault();
    const nextTab = sectionLinks[nextIndex][2];
    setActiveTab(nextTab);
    requestAnimationFrame(() =>
      document.getElementById(`methodology-tab-${nextTab}`)?.focus(),
    );
  }
  const reveal = {
    initial: reduceMotion ? false : { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.55, ease: [0.2, 0.75, 0.25, 1] as const },
  };

  return (
    <article className="relative min-h-[calc(100vh-76px)] overflow-visible bg-[#02090b] text-[#e7f3f1]">
      <div className="fx-explorer-grid pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute top-[-15rem] right-0 size-[42rem] rounded-full bg-[#0d7877]/10 blur-[130px]" />

      <div className="relative mx-auto max-w-[1600px] px-5 py-10 sm:px-8 lg:px-14 lg:py-14">
        <motion.header
          className="border-b border-[#174749] pb-10 lg:pb-12"
          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.2, 0.75, 0.25, 1] }}
        >
          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div>
              <p className="fx-kicker">Transparent by design</p>
              <h1 className="mt-4 text-4xl font-medium tracking-[-0.05em] text-[#f0f7f5] sm:text-5xl lg:text-6xl">
                Methodology{" "}
                <span className="fx-gradient-text">under the X-Ray</span>
              </h1>
              <p className="mt-5 max-w-3xl text-sm leading-7 text-[#91acad] sm:text-base">
                Reproducible market-capacity scenarios, explicit evidence
                quality, and clear interpretation boundaries. Every unavailable
                input remains visible rather than becoming false precision.
              </p>
            </div>
            <div className="grid shrink-0 grid-cols-2 gap-px border border-[#1a5557] bg-[#153b3d] sm:min-w-80">
              <HeroDatum
                label="Methodology"
                value={`v${METHODOLOGY_VERSION}`}
              />
              <HeroDatum label="Base currency" value="USD" />
              <HeroDatum label="Default position" value="$100K" />
              <HeroDatum label="Default participation" value="5%" />
            </div>
          </div>
        </motion.header>

        <motion.section
          className="grid gap-px border border-[#174749] bg-[#153b3d] md:grid-cols-3"
          aria-label="Methodology principles"
          {...reveal}
        >
          {principles.map(({ icon: Icon, title, copy }) => (
            <div key={title} className="bg-[#041416] p-5 sm:p-6">
              <Icon className="size-5 text-[#59e8e1]" aria-hidden="true" />
              <h2 className="mt-4 text-sm font-semibold text-[#dcecea]">
                {title === "Observed data" ? (
                  <TechnicalTerm term="observedData">{title}</TechnicalTerm>
                ) : title === "Explicit assumptions" ? (
                  <TechnicalTerm term="explicitAssumptions">
                    {title}
                  </TechnicalTerm>
                ) : (
                  <TechnicalTerm term="missingData">{title}</TechnicalTerm>
                )}
              </h2>
              <p className="mt-2 text-xs leading-6 text-[#6f9395]">{copy}</p>
            </div>
          ))}
        </motion.section>

        <div
          className="mt-10 flex overflow-x-auto border border-[#1a5557] bg-[#041214] p-1"
          role="tablist"
          aria-label="Methodology sections"
        >
          {sectionLinks.map(([number, label, id]) => (
            <button
              key={id}
              id={`methodology-tab-${id}`}
              className={
                activeTab === id
                  ? "fx-detail-tab fx-detail-tab-active"
                  : "fx-detail-tab"
              }
              type="button"
              role="tab"
              aria-selected={activeTab === id}
              aria-controls={`methodology-panel-${id}`}
              tabIndex={activeTab === id ? 0 : -1}
              onClick={() => setActiveTab(id)}
              onKeyDown={(event) => handleTabKeyDown(event, id)}
            >
              <span className="mr-2 text-[8px] text-[#45bdb8]">{number}</span>
              {label}
            </button>
          ))}
        </div>

        <div className="mt-6 min-w-0">
          <AnimatePresence mode="wait" initial={false}>
            {activeTab === "capacity-model" ? (
              <motion.section
                key="capacity-model"
                id="methodology-panel-capacity-model"
                className="border border-[#1a5557] bg-[#031113]/94"
                role="tabpanel"
                aria-labelledby="methodology-tab-capacity-model"
                initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
                transition={{
                  duration: 0.28,
                  ease: [0.2, 0.75, 0.25, 1],
                }}
              >
                <SectionHeader
                  number="01"
                  icon={Calculator}
                  eyebrow="Volume participation scenario"
                  title="Capacity model"
                  id="capacity-model-heading"
                  description="The model translates observed 24-hour volume into an explicit capacity estimate for one position."
                />
                <div className="grid gap-px bg-[#153b3d] xl:grid-cols-[1.25fr_0.75fr]">
                  <div className="bg-[#041416] p-5 sm:p-7">
                    <Formula
                      label="Effective volume"
                      formula="Vₑ = V × (1 − h)"
                      detail="Observed volume after the selected stress haircut."
                    />
                    <Formula
                      label="Daily capacity"
                      formula="C = Vₑ × r"
                      detail="The share of effective volume allowed by participation."
                    />
                    <Formula
                      label="Estimated exit days"
                      formula="D = P ÷ C"
                      detail="Position value divided by scenario daily capacity."
                      last
                    />
                  </div>
                  <div className="bg-[#061719] p-5 sm:p-7">
                    <p className="fx-kicker">Variable registry</p>
                    <dl className="mt-5 space-y-3">
                      <Definition symbol="P" term="positionVariable" />
                      <Definition symbol="V" term="volumeVariable" />
                      <Definition symbol="r" term="participationVariable" />
                      <Definition symbol="h" term="haircutVariable" />
                    </dl>
                    <div className="mt-6 border border-[#73552d] bg-[#1d160c] p-4 font-mono text-[9px] leading-5 text-[#e6bb74]">
                      Capacity is a planning proxy. It is not a promise of
                      execution time or price.
                    </div>
                  </div>
                </div>
              </motion.section>
            ) : null}

            {activeTab === "concentration" ? (
              <motion.section
                key="concentration"
                id="methodology-panel-concentration"
                className="border border-[#1a5557] bg-[#031113]/94"
                role="tabpanel"
                aria-labelledby="methodology-tab-concentration"
                initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
                transition={{
                  duration: 0.28,
                  ease: [0.2, 0.75, 0.25, 1],
                }}
              >
                <SectionHeader
                  number="02"
                  icon={Network}
                  eyebrow="Observed distribution"
                  title="Concentration and price consistency"
                  id="concentration-heading"
                  description="Market, exchange, token, and issuer dimensions are calculated separately so one strong dimension cannot hide another."
                />
                <div className="grid gap-px bg-[#153b3d] md:grid-cols-2">
                  <div className="bg-[#041416] p-5 sm:p-7">
                    <h3 className="text-sm font-semibold text-[#dcecea]">
                      Volume concentration
                    </h3>
                    <div className="mt-5 border border-[#174749] bg-[#020d0f] p-5 font-mono text-sm leading-8 text-[#85e8e3]">
                      <TechnicalTerm term="volumeShare">shareᵢ</TechnicalTerm> =
                      volumeᵢ ÷ Σ volume
                      <br />
                      <TechnicalTerm term="hhi">HHI</TechnicalTerm> = Σ shareᵢ²
                      <br />
                      <TechnicalTerm term="normalizedHhiMethod">
                        normalized HHI
                      </TechnicalTerm>{" "}
                      = (HHI − 1/n) ÷ (1 − 1/n), n &gt; 1
                    </div>
                    <p className="mt-4 text-xs leading-6 text-[#719294]">
                      Values near zero are more distributed; values near one are
                      more concentrated. Fewer than two observations are labeled
                      insufficient rather than assigned inferred
                      diversification. Issuer concentration requires at least{" "}
                      {ANALYSIS_CONFIG.issuerCoverageMinimum * 100}% mapped
                      volume.
                    </p>
                  </div>
                  <div className="bg-[#041416] p-5 sm:p-7">
                    <div className="flex items-center gap-3">
                      <Clock3
                        className="size-5 text-[#59e8e1]"
                        aria-hidden="true"
                      />
                      <h3 className="text-sm font-semibold text-[#dcecea]">
                        <TechnicalTerm term="pairFreshness" />
                      </h3>
                    </div>
                    <dl className="mt-5 space-y-2">
                      {freshnessBands.map(([band, meaning]) => (
                        <div
                          key={band}
                          className="flex flex-col justify-between gap-1 border-b border-[#173b3d] py-3 last:border-0 sm:flex-row sm:gap-4"
                        >
                          <dt className="font-mono text-[10px] font-semibold text-[#68e7e1]">
                            {band}
                          </dt>
                          <dd className="text-xs text-[#719294] sm:text-right">
                            {meaning}
                          </dd>
                        </div>
                      ))}
                    </dl>
                    <p className="mt-4 text-xs leading-6 text-[#719294]">
                      Price dispersion preserves observed outliers, while robust
                      calculations use median absolute deviation to flag them.
                    </p>
                  </div>
                </div>
              </motion.section>
            ) : null}

            {activeTab === "scores" ? (
              <motion.section
                key="scores"
                id="methodology-panel-scores"
                className="border border-[#1a5557] bg-[#031113]/94"
                role="tabpanel"
                aria-labelledby="methodology-tab-scores"
                initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
                transition={{
                  duration: 0.28,
                  ease: [0.2, 0.75, 0.25, 1],
                }}
              >
                <SectionHeader
                  number="03"
                  icon={Activity}
                  eyebrow="Two separate signals"
                  title="Health and Evidence Coverage"
                  id="scores-heading"
                  description="Health describes available market-capacity characteristics. Evidence Coverage describes how complete the observation is."
                />
                <div className="grid gap-px bg-[#153b3d] xl:grid-cols-2">
                  <WeightPanel
                    title="Market Capacity Health"
                    note={`Published only when at least ${ANALYSIS_CONFIG.compositeCoverageMinimum * 100}% of component weight is available.`}
                    weights={healthWeights}
                    accent="cyan"
                  />
                  <WeightPanel
                    title="Evidence Coverage"
                    note="Labels: Limited 0–59, Moderate 60–79, High 80–100."
                    weights={evidenceWeights}
                    accent="amber"
                  />
                </div>
              </motion.section>
            ) : null}

            {activeTab === "limits" ? (
              <motion.section
                key="limits"
                id="methodology-panel-limits"
                className="border border-[#73552d] bg-[#141007]"
                role="tabpanel"
                aria-labelledby="methodology-tab-limits"
                initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
                transition={{
                  duration: 0.28,
                  ease: [0.2, 0.75, 0.25, 1],
                }}
              >
                <div className="flex items-start gap-4 border-b border-[#5d4628] p-5 sm:p-6">
                  <TriangleAlert
                    className="mt-0.5 size-5 shrink-0 text-[#e5b45f]"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="font-mono text-[9px] tracking-[0.16em] text-[#d6a756] uppercase">
                      04 · Interpretation guardrails
                    </p>
                    <h2
                      id="limits-heading"
                      className="mt-2 text-xl font-medium text-[#f2dfbd]"
                    >
                      What the analysis does not claim
                    </h2>
                  </div>
                </div>
                <ul className="grid gap-px bg-[#5d4628] md:grid-cols-2">
                  {assumptions.map((assumption, index) => (
                    <li
                      key={assumption}
                      className={`flex gap-3 bg-[#181208] p-5 text-xs leading-6 text-[#c9ae7e] ${
                        index === assumptions.length - 1 ? "md:col-span-2" : ""
                      }`}
                    >
                      <CheckCircle2
                        className="mt-1 size-3.5 shrink-0 text-[#dcae5e]"
                        aria-hidden="true"
                      />
                      {assumption}
                    </li>
                  ))}
                </ul>
              </motion.section>
            ) : null}
          </AnimatePresence>

          <motion.footer
            className="mt-6 flex flex-col justify-between gap-5 border border-[#1a5557] bg-[#041416] p-6 sm:flex-row sm:items-center"
            {...reveal}
          >
            <div>
              <p className="fx-kicker">Apply the framework</p>
              <p className="mt-2 text-sm text-[#91acad]">
                Inspect one asset or compare up to four under the same
                assumptions.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link className="fx-compare-secondary" href="/assets">
                Open Explorer <ArrowRight className="size-4" />
              </Link>
              <Link className="fx-compare-action" href="/compare">
                Compare assets <Scale className="size-4" />
              </Link>
            </div>
          </motion.footer>
        </div>
      </div>
    </article>
  );
}

function HeroDatum({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#041416] p-4">
      <p className="font-mono text-[8px] tracking-[0.12em] text-[#739799] uppercase">
        {label}
      </p>
      <p className="mt-2 font-mono text-xs font-semibold text-[#b9d8d5]">
        {value}
      </p>
    </div>
  );
}

function SectionHeader({
  number,
  icon: Icon,
  eyebrow,
  title,
  id,
  description,
}: {
  number: string;
  icon: typeof Calculator;
  eyebrow: string;
  title: string;
  id: string;
  description: string;
}) {
  return (
    <div className="flex flex-col justify-between gap-4 border-b border-[#153b3d] p-5 sm:p-6 md:flex-row md:items-end">
      <div>
        <p className="flex items-center gap-3 font-mono text-[9px] tracking-[0.15em] text-[#57ddd7] uppercase">
          <span>{number}</span>
          <Icon className="size-3.5" aria-hidden="true" />
          {eyebrow}
        </p>
        <h2 id={id} className="mt-3 text-2xl font-medium tracking-[-0.025em]">
          {title}
        </h2>
      </div>
      <p className="max-w-xl text-xs leading-6 text-[#719294]">{description}</p>
    </div>
  );
}

function Formula({
  label,
  formula,
  detail,
  last = false,
}: {
  label: string;
  formula: string;
  detail: string;
  last?: boolean;
}) {
  return (
    <div className={last ? "py-5" : "border-b border-[#173b3d] py-5"}>
      <p className="font-mono text-[9px] tracking-[0.12em] text-[#739799] uppercase">
        {label}
      </p>
      <code className="mt-2 block text-lg text-[#72eee8] sm:text-xl">
        {formula}
      </code>
      <p className="mt-2 text-xs leading-5 text-[#719294]">{detail}</p>
    </div>
  );
}

function Definition({
  symbol,
  term,
}: {
  symbol: string;
  term: Parameters<typeof TechnicalTerm>[0]["term"];
}) {
  return (
    <div className="flex items-center gap-3 border-b border-[#173b3d] pb-3 last:border-0">
      <dt className="grid size-8 shrink-0 place-items-center border border-[#2d7678] bg-[#082426] font-mono text-xs text-[#6ce9e3]">
        {symbol}
      </dt>
      <dd className="text-xs text-[#91acad]">
        <TechnicalTerm term={term} />
      </dd>
    </div>
  );
}

function weightTerm(
  label: string,
): Parameters<typeof TechnicalTerm>[0]["term"] {
  const terms: Record<string, Parameters<typeof TechnicalTerm>[0]["term"]> = {
    "Observed activity": "observedMarketActivity",
    Diversification: "concentrationRisk",
    "Price consistency": "priceConsistency",
    "Market availability": "marketAvailability",
    "Data freshness": "dataFreshness",
    "Aggregate quote": "aggregateQuote",
    "Fresh source timestamp": "freshTimestamp",
    "Market-pair coverage": "marketPairCoverage",
    "Token breakdown": "tokenBreakdown",
    "Issuer mapping": "issuerMapping",
    "Cross-field consistency": "crossFieldConsistency",
  };
  return terms[label] ?? "observedData";
}

function WeightPanel({
  title,
  note,
  weights,
  accent,
}: {
  title: string;
  note: string;
  weights: ReadonlyArray<readonly [string, number]>;
  accent: "cyan" | "amber";
}) {
  return (
    <div className="bg-[#041416] p-5 sm:p-7">
      <h3 className="text-sm font-semibold text-[#dcecea]">
        <TechnicalTerm
          term={
            title === "Market Capacity Health"
              ? "marketCapacityHealth"
              : "evidenceCoverage"
          }
        />
      </h3>
      <p className="mt-2 min-h-10 text-xs leading-5 text-[#719294]">{note}</p>
      <dl className="mt-5 space-y-4">
        {weights.map(([label, weight]) => (
          <div key={label}>
            <div className="flex justify-between gap-4 text-xs">
              <dt className="text-[#91acad]">
                <TechnicalTerm term={weightTerm(label)} />
              </dt>
              <dd className="font-mono text-[10px] text-[#bfd6d4]">
                {weight}%
              </dd>
            </div>
            <div className="mt-2 h-1 overflow-hidden bg-[#153638]">
              <div
                className={
                  accent === "cyan"
                    ? "h-full bg-[#50e8e1] shadow-[0_0_8px_rgba(80,232,225,0.3)]"
                    : "h-full bg-[#d9a957] shadow-[0_0_8px_rgba(217,169,87,0.25)]"
                }
                style={{ width: `${weight}%` }}
              />
            </div>
          </div>
        ))}
      </dl>
    </div>
  );
}
