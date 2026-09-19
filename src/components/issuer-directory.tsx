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
  Search,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import {
  getIssuerDirectory,
  type IssuerDirectoryResponse,
  RwaApiError,
} from "@/lib/rwa-api";

const pageSize = 24;

export function IssuerDirectory() {
  const reduceMotion = useReducedMotion();
  const [page, setPage] = useState(1);
  const [activeOnly, setActiveOnly] = useState(true);
  const [search, setSearch] = useState("");
  const start = (page - 1) * pageSize + 1;
  const query = useQuery({
    queryKey: ["issuer-directory", activeOnly, start],
    queryFn: () =>
      getIssuerDirectory({
        active: activeOnly ? true : undefined,
        start,
        limit: pageSize,
      }),
    refetchInterval: 60_000,
  });
  const issuers = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return query.data?.items ?? [];
    return (query.data?.items ?? []).filter((issuer) =>
      issuer.name.toLowerCase().includes(needle),
    );
  }, [query.data?.items, search]);

  function changePage(nextPage: number) {
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }

  return (
    <section className="relative min-h-[calc(100vh-76px)] overflow-hidden bg-[#02090b] text-[#e7f3f1]">
      <div className="fx-explorer-grid pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute top-[-16rem] right-[-8rem] size-[38rem] rounded-full bg-[#0f7776]/10 blur-[120px]" />
      <div className="relative mx-auto max-w-[1600px] px-5 py-10 sm:px-8 lg:px-14 lg:py-14">
        <motion.header
          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <p className="fx-kicker">Tokenization ecosystem</p>
          <h1 className="mt-4 text-4xl font-medium tracking-[-0.045em] text-[#f0f7f5] sm:text-5xl lg:text-6xl">
            Issuer <span className="fx-gradient-text">Directory</span>
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[#91acad] sm:text-base">
            Inspect organizations associated with tokenized representations and
            trace their issued tokens back to canonical RWA assets. Issuer
            metadata is not reserve or legal-claim verification.
          </p>
        </motion.header>

        <div className="mt-8 grid gap-px border border-[#174749] bg-[#143638] md:grid-cols-[1fr_auto_auto]">
          <label className="bg-[#041214] p-4">
            <span className="mb-2 block font-mono text-[8px] tracking-[0.16em] text-[#557f81] uppercase">
              Search current page
            </span>
            <span className="relative block">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#4bc9c4]" />
              <input
                className="fx-explorer-input pl-10"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.currentTarget.value)}
                placeholder="Search issuer name"
              />
            </span>
          </label>
          <label className="flex min-h-20 cursor-pointer items-center gap-3 bg-[#041214] px-5 py-4 font-mono text-[10px] tracking-[0.08em] text-[#a9c1c0] uppercase">
            <input
              className="size-4 accent-[#44e5de]"
              type="checkbox"
              checked={activeOnly}
              onChange={(event) => {
                setActiveOnly(event.currentTarget.checked);
                setPage(1);
              }}
            />
            Active issuers only
          </label>
          <div className="flex items-center bg-[#041214] p-4">
            <button
              className="fx-explorer-tool"
              type="button"
              onClick={() => void query.refetch()}
              aria-label="Refresh issuer directory"
            >
              <RefreshCw
                className={`size-4 ${query.isFetching ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              Refresh
            </button>
          </div>
        </div>

        {query.data?.stale ? (
          <div className="status-banner status-banner-warning mt-4">
            <AlertTriangle className="size-4 shrink-0" /> Showing labeled stale
            issuer data because live refresh is unavailable.
          </div>
        ) : null}

        <div className="mt-5 border border-[#174749] bg-[#030e10]/95">
          <div className="flex items-center justify-between border-b border-[#153b3d] px-5 py-4">
            <h2 className="flex items-center gap-3 font-mono text-[10px] font-semibold tracking-[0.18em] text-[#b8cecd] uppercase">
              <Building2 className="size-4 text-[#55e8e1]" /> Issuer registry
            </h2>
            {query.data ? (
              <span className="font-mono text-[9px] text-[#527c7e] uppercase">
                {issuers.length} visible
              </span>
            ) : null}
          </div>

          {query.isLoading ? <IssuerSkeleton /> : null}
          {query.error ? (
            <IssuerError
              error={query.error}
              retry={() => void query.refetch()}
            />
          ) : null}
          {query.data && issuers.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <h3 className="text-lg font-semibold">No issuers found</h3>
              <p className="mt-2 text-sm text-[#78999b]">
                Clear the current-page search or include inactive issuers.
              </p>
            </div>
          ) : null}
          {issuers.length > 0 ? (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3">
              {issuers.map((issuer, index) => (
                <IssuerCard
                  key={issuer.issuerId}
                  issuer={issuer}
                  index={index}
                  reduceMotion={Boolean(reduceMotion)}
                />
              ))}
            </div>
          ) : null}
        </div>

        {query.data ? (
          <div className="mt-5 flex flex-col justify-between gap-4 border-t border-[#123638] pt-5 sm:flex-row sm:items-center">
            <p className="font-mono text-[9px] tracking-[0.12em] text-[#527c7e] uppercase">
              Page {String(page).padStart(2, "0")}
              {query.data.pagination.totalSize !== null
                ? ` · ${query.data.pagination.totalSize.toLocaleString("en-US")} issuers`
                : ""}
            </p>
            <div className="flex gap-2">
              <PageButton
                disabled={page === 1}
                onClick={() => changePage(Math.max(1, page - 1))}
              >
                <ArrowLeft className="size-4" /> Previous
              </PageButton>
              <PageButton
                disabled={!query.data.pagination.hasMore}
                onClick={() => changePage(page + 1)}
              >
                Next <ArrowRight className="size-4" />
              </PageButton>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function IssuerCard({
  issuer,
  index,
  reduceMotion,
}: {
  issuer: IssuerDirectoryResponse["items"][number];
  index: number;
  reduceMotion: boolean;
}) {
  const website = safeExternalUrl(issuer.website);
  return (
    <motion.article
      className="border-r border-b border-[#123638] p-5 transition-colors hover:bg-[#061719] sm:p-6"
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: reduceMotion ? 0 : index * 0.025 }}
    >
      <div className="flex items-start gap-4">
        <div className="grid size-12 shrink-0 place-items-center border border-[#287b7c] bg-[#082123] font-mono text-sm font-bold text-[#63ebe4]">
          {issuer.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-[#edf7f5]">
            {issuer.name}
          </h3>
          <p className="mt-1 font-mono text-[9px] text-[#557f81] uppercase">
            {issuer.tokenCount === null
              ? "Token count unavailable"
              : `${issuer.tokenCount.toLocaleString("en-US")} linked tokens`}
          </p>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Link
          className="fx-compare-secondary"
          href={`/issuers/${issuer.issuerId}`}
        >
          View issuer <ArrowRight className="size-3.5" />
        </Link>
        {website ? (
          <a
            className="inline-flex min-h-10 items-center gap-2 px-2 text-xs text-[#70aaa9] hover:text-[#b9fffb] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#55e9e2]"
            href={website}
            target="_blank"
            rel="noreferrer"
          >
            Website <ExternalLink className="size-3.5" />
          </a>
        ) : null}
      </div>
    </motion.article>
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

function IssuerSkeleton() {
  return (
    <div
      className="grid sm:grid-cols-2 xl:grid-cols-3"
      aria-label="Loading issuers"
    >
      {Array.from({ length: 9 }).map((_, index) => (
        <div
          key={index}
          className="fx-explorer-skeleton h-40 border-r border-b border-[#123638]"
        />
      ))}
    </div>
  );
}

function IssuerError({ error, retry }: { error: unknown; retry(): void }) {
  const rateLimited = error instanceof RwaApiError && error.status === 429;
  return (
    <div className="p-6 text-[#efb3b6]" role="alert">
      <AlertTriangle className="size-5" />
      <p className="mt-3 font-semibold">
        {rateLimited ? "Issuer rate limit reached" : "Issuer data unavailable"}
      </p>
      <p className="mt-2 text-sm text-[#c99da0]">
        No synthetic issuer records are substituted.
      </p>
      <button
        className="fx-compare-secondary mt-4"
        type="button"
        onClick={retry}
      >
        Retry
      </button>
    </div>
  );
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
