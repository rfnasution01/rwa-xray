"use client";

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState, type Dispatch, type SetStateAction } from "react";

export type SortDirection = "asc" | "desc";
export type SortValue = number | string | null;

const tablePageSize = 10;

type SortState<TKey extends string> = {
  key: TKey;
  direction: SortDirection;
};

export type SortableTableControls<TKey extends string> = {
  currentPage: number;
  endIndex: number;
  pageCount: number;
  requestSort(key: TKey): void;
  setPage: Dispatch<SetStateAction<number>>;
  sort: SortState<TKey>;
  startIndex: number;
  totalRows: number;
};

export type SortableTableState<
  T,
  TKey extends string,
> = SortableTableControls<TKey> & {
  visibleRows: T[];
};

export function useSortableTable<T, TKey extends string>(
  rows: T[],
  initialKey: TKey,
  getValue: (row: T, key: TKey) => SortValue,
  initialDirection: SortDirection = "asc",
): SortableTableState<T, TKey> {
  const [sort, setSort] = useState<SortState<TKey>>({
    key: initialKey,
    direction: initialDirection,
  });
  const [page, setPage] = useState(1);
  const sortedRows = rows
    .map((row, index) => ({ row, index }))
    .sort((left, right) => {
      const comparison = compareSortValues(
        getValue(left.row, sort.key),
        getValue(right.row, sort.key),
        sort.direction,
      );
      return comparison === 0 ? left.index - right.index : comparison;
    })
    .map(({ row }) => row);
  const pageCount = Math.max(1, Math.ceil(sortedRows.length / tablePageSize));
  const currentPage = Math.min(page, pageCount);
  const startIndex = (currentPage - 1) * tablePageSize;

  function requestSort(key: TKey) {
    setSort((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
    setPage(1);
  }

  return {
    currentPage,
    endIndex: Math.min(startIndex + tablePageSize, sortedRows.length),
    pageCount,
    requestSort,
    setPage,
    sort,
    startIndex,
    totalRows: sortedRows.length,
    visibleRows: sortedRows.slice(startIndex, startIndex + tablePageSize),
  };
}

export function SortableHeader<TKey extends string>({
  label,
  column,
  table,
  align = "left",
}: {
  label: string;
  column: TKey;
  table: SortableTableControls<TKey>;
  align?: "left" | "right";
}) {
  const active = table.sort.key === column;
  const ariaSort = active
    ? table.sort.direction === "asc"
      ? "ascending"
      : "descending"
    : "none";

  return (
    <th
      className={align === "right" ? "text-right" : undefined}
      aria-sort={ariaSort}
    >
      <button
        className={`inline-flex min-h-10 items-center gap-1.5 text-left transition hover:text-[#b8fffb] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#55eee7] ${align === "right" ? "ml-auto" : ""}`}
        type="button"
        aria-label={
          active
            ? `Sort by ${label}, currently ${table.sort.direction === "asc" ? "ascending" : "descending"}`
            : `Sort by ${label}`
        }
        onClick={() => table.requestSort(column)}
      >
        {label}
        {active ? (
          table.sort.direction === "asc" ? (
            <ArrowUp className="size-3.5" aria-hidden="true" />
          ) : (
            <ArrowDown className="size-3.5" aria-hidden="true" />
          )
        ) : (
          <ArrowUpDown className="size-3.5 text-[#608587]" aria-hidden="true" />
        )}
      </button>
    </th>
  );
}

export function TablePagination<TKey extends string>({
  table,
  label,
}: {
  table: SortableTableControls<TKey>;
  label: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#153b3d] bg-[#031012] px-4 py-3">
      <p
        className="font-mono text-[9px] tracking-[0.06em] text-[#719395] uppercase"
        aria-live="polite"
      >
        Showing {table.startIndex + 1}–{table.endIndex} of {table.totalRows}
      </p>
      <div className="flex items-center gap-2">
        <button
          className="grid size-9 place-items-center border border-[#285f61] text-[#8bc4c2] transition hover:border-[#55e8e1] hover:text-[#dffffb] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#55eee7] disabled:cursor-not-allowed disabled:opacity-35"
          type="button"
          aria-label={`Previous page of ${label}`}
          disabled={table.currentPage === 1}
          onClick={() => table.setPage(table.currentPage - 1)}
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </button>
        <span className="min-w-24 text-center font-mono text-[10px] text-[#a9c5c4]">
          Page {table.currentPage} of {table.pageCount}
        </span>
        <button
          className="grid size-9 place-items-center border border-[#285f61] text-[#8bc4c2] transition hover:border-[#55e8e1] hover:text-[#dffffb] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#55eee7] disabled:cursor-not-allowed disabled:opacity-35"
          type="button"
          aria-label={`Next page of ${label}`}
          disabled={table.currentPage === table.pageCount}
          onClick={() => table.setPage(table.currentPage + 1)}
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function compareSortValues(
  left: SortValue,
  right: SortValue,
  direction: SortDirection,
) {
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  const comparison =
    typeof left === "number" && typeof right === "number"
      ? left - right
      : String(left).localeCompare(String(right), "en", {
          numeric: true,
          sensitivity: "base",
        });
  return direction === "asc" ? comparison : -comparison;
}
