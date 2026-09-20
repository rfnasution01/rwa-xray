"use client";

import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Building2,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { getIssuerDetail, RwaApiError } from "@/lib/rwa-api";

const pageSize = 100;

export function IssuerDetailView({ issuerId }: { issuerId: string }) {
  const reduceMotion = useReducedMotion();
  const [page, setPage] = useState(1);
  const start = (page - 1) * pageSize + 1;
  const query = useQuery({
    queryKey: ["issuer-detail", issuerId, start],
    queryFn: () => getIssuerDetail(issuerId, { start, limit: pageSize }),
    refetchInterval: 60_000,
  });

  function changePage(nextPage: number) {
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }

  if (query.isLoading) return <IssuerDetailSkeleton />;
  if (query.error)
    return (
      <IssuerDetailError
        error={query.error}
        retry={() => void query.refetch()}
      />
    );
  if (!query.data) return null;

  const { issuer } = query.data;
  const website = safeExternalUrl(issuer.website);
  return (
    <section className="relative min-h-[calc(100vh-76px)] overflow-hidden bg-[#02090b] text-[#e7f3f1]">
      <div className="fx-explorer-grid pointer-events-none absolute inset-0" />
      <div className="relative mx-auto max-w-[1400px] px-5 py-8 sm:px-8 lg:px-14 lg:py-10">
        <Link
          className="inline-flex items-center gap-2 font-mono text-[9px] font-semibold tracking-[0.12em] text-[#59e8e1] uppercase focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#59e8e1]"
          href="/issuers"
        >
          <ArrowLeft className="size-4" /> Back to Issuers
        </Link>

        <motion.header
          className="mt-6 border border-[#174f51] bg-[#041214]/92 p-5 sm:p-7 lg:flex lg:items-center lg:justify-between"
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-start gap-4">
            <div className="grid size-16 shrink-0 place-items-center border border-[#3b9b99] bg-[#071a1c] font-mono text-lg font-bold text-[#73f4ed]">
              {issuer.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="fx-kicker">Issuer profile</p>
              <h1 className="mt-2 text-3xl font-medium tracking-[-0.04em] text-[#f0f7f5] sm:text-4xl">
                {issuer.name}
              </h1>
              <p className="mt-2 font-mono text-[9px] tracking-[0.08em] text-[#608587] uppercase">
                {issuer.issuerId}
              </p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2 lg:mt-0">
            {website ? (
              <a
                className="fx-compare-secondary"
                href={website}
                target="_blank"
                rel="noreferrer"
              >
                Issuer website <ExternalLink className="size-4" />
              </a>
            ) : null}
            <button
              className="fx-compare-secondary"
              type="button"
              onClick={() => void query.refetch()}
            >
              <RefreshCw
                className={`size-4 ${query.isFetching ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>
        </motion.header>

        {query.data.stale ? (
          <div className="status-banner status-banner-warning mt-4">
            <AlertTriangle className="size-4 shrink-0" /> Showing labeled stale
            issuer data because live refresh is unavailable.
          </div>
        ) : null}

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <IssuerMetric
            label="Reported token count"
            value={formatCount(issuer.tokenCount)}
          />
          <IssuerMetric
            label="Linked token records"
            value={formatCount(issuer.linkedTokenTotal)}
          />
          <IssuerMetric
            label="Current page"
            value={String(page).padStart(2, "0")}
          />
        </div>

        <motion.section
          className="mt-5 border border-[#174749] bg-[#030e10]/95"
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reduceMotion ? 0 : 0.08 }}
          aria-labelledby="issued-assets-title"
        >
          <div className="border-b border-[#153b3d] px-5 py-4 sm:px-6">
            <h2
              id="issued-assets-title"
              className="flex items-center gap-3 font-mono text-[10px] font-semibold tracking-[0.18em] text-[#b8cecd] uppercase"
            >
              <Building2 className="size-4 text-[#55e8e1]" /> Issued tokens
            </h2>
            <p className="mt-2 text-xs leading-5 text-[#668d8f]">
              Token relationships are reported by CoinMarketCap. They do not
              verify reserves, redemption rights, or legal claims.
            </p>
          </div>

          {issuer.tokens.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <h3 className="font-semibold">No linked tokens returned</h3>
              <p className="mt-2 text-sm text-[#78999b]">
                The issuer exists, but this page contains no token records.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="table-head">
                  <tr>
                    <th>Token</th>
                    <th>Crypto ID</th>
                    <th>Underlying RWA</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="table-body">
                  {issuer.tokens.map((token) => (
                    <tr key={token.cryptoId}>
                      <td>
                        <strong>{token.symbol}</strong>
                        <span className="block text-xs text-slate-500">
                          {token.name}
                        </span>
                      </td>
                      <td className="font-mono text-xs">{token.cryptoId}</td>
                      <td className="font-mono text-xs">
                        {token.rwaId === null
                          ? "Unmapped"
                          : `RWA #${token.rwaId}`}
                      </td>
                      <td className="text-right">
                        {token.rwaId !== null ? (
                          <Link
                            className="inline-flex items-center gap-2 text-[#5ee9e2] hover:text-[#c3fffc] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#55e9e2]"
                            href={`/assets/${token.rwaId}`}
                          >
                            Open X-Ray <ArrowRight className="size-3.5" />
                          </Link>
                        ) : (
                          <span className="text-[#678b8d]">Unavailable</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.section>

        <div className="mt-5 flex justify-end gap-2">
          <PageButton
            disabled={page === 1}
            onClick={() => changePage(Math.max(1, page - 1))}
          >
            <ArrowLeft className="size-4" /> Previous
          </PageButton>
          <PageButton
            disabled={issuer.hasMore !== true}
            onClick={() => changePage(page + 1)}
          >
            Next <ArrowRight className="size-4" />
          </PageButton>
        </div>
      </div>
    </section>
  );
}

function IssuerMetric({ label, value }: { label: string; value: string }) {
  return (
    <article className="border border-[#174749] bg-[#041214] p-5">
      <p className="font-mono text-[8px] tracking-[0.15em] text-[#739799] uppercase">
        {label}
      </p>
      <p className="mt-3 text-2xl font-medium text-[#e9f6f4] tabular-nums">
        {value}
      </p>
    </article>
  );
}

function PageButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled: boolean;
  onClick(): void;
}) {
  return (
    <button
      className="fx-compare-secondary disabled:cursor-not-allowed disabled:opacity-40"
      type="button"
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function IssuerDetailSkeleton() {
  return (
    <div className="min-h-[calc(100vh-76px)] bg-[#02090b] px-5 py-10 sm:px-8 lg:px-14">
      <div className="fx-explorer-skeleton mx-auto h-44 max-w-[1400px] border border-[#174749]" />
      <div className="fx-explorer-skeleton mx-auto mt-5 h-80 max-w-[1400px] border border-[#174749]" />
    </div>
  );
}

function IssuerDetailError({
  error,
  retry,
}: {
  error: unknown;
  retry(): void;
}) {
  const rateLimited = error instanceof RwaApiError && error.status === 429;
  return (
    <div className="min-h-[calc(100vh-76px)] bg-[#02090b] px-5 py-16 text-[#efb3b6]">
      <div
        className="mx-auto max-w-xl border border-[#783d43] bg-[#211013] p-6"
        role="alert"
      >
        <AlertTriangle className="size-6" />
        <h1 className="mt-3 text-xl font-semibold text-[#ffe5e6]">
          {rateLimited ? "Issuer rate limit reached" : "Issuer unavailable"}
        </h1>
        <p className="mt-2 text-sm text-[#c99da0]">
          No synthetic issuer or token relationships are substituted.
        </p>
        <button
          className="fx-compare-secondary mt-4"
          type="button"
          onClick={retry}
        >
          Retry
        </button>
      </div>
    </div>
  );
}

function formatCount(value: number | null) {
  return value === null ? "Unavailable" : value.toLocaleString("en-US");
}

function safeExternalUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}
