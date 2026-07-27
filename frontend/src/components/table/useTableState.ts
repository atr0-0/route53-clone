"use client";

import { useCallback, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export interface TableStateOptions {
  defaultSort?: string;
  defaultPageSize?: number;
}

export interface TableState {
  /** Immediate input value, for the TextFilter's own `filteringText` prop. */
  filteringText: string;
  setFilteringText: (text: string) => void;
  /** Debounced value that actually drives the fetch — bound to the URL, only
   * updated via TextFilter's `onDelayedChange` (invariant 12). */
  search: string;
  setSearch: (text: string) => void;
  type: string;
  setType: (type: string) => void;
  routingPolicy: string;
  setRoutingPolicy: (routingPolicy: string) => void;
  alias: string;
  setAlias: (alias: string) => void;
  sort: string;
  order: "asc" | "desc";
  setSorting: (sort: string, order: "asc" | "desc") => void;
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
  setPageSize: (pageSize: number) => void;
}

/**
 * Binds filter, type, sort, page, and page size to the URL (FR-E11) — one hook,
 * reused by every table (invariant 14).
 */
export function useTableState(options: TableStateOptions = {}): TableState {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const search = searchParams.get("search") ?? "";
  const [filteringText, setFilteringText] = useState(search);

  const type = searchParams.get("type") ?? "";
  const routingPolicy = searchParams.get("routingPolicy") ?? "";
  const alias = searchParams.get("alias") ?? "";
  const sort = searchParams.get("sort") ?? options.defaultSort ?? "";
  const order = (searchParams.get("order") === "desc" ? "desc" : "asc") as "asc" | "desc";
  const page = Number(searchParams.get("page") ?? "1") || 1;
  const pageSize = Number(searchParams.get("pageSize") ?? String(options.defaultPageSize ?? 10)) || 10;

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  return {
    filteringText,
    setFilteringText,
    search,
    setSearch: (value: string) => updateParams({ search: value || null, page: null }),
    type,
    setType: (value: string) => updateParams({ type: value || null, page: null }),
    routingPolicy,
    setRoutingPolicy: (value: string) => updateParams({ routingPolicy: value || null, page: null }),
    alias,
    setAlias: (value: string) => updateParams({ alias: value || null, page: null }),
    sort,
    order,
    setSorting: (sortField: string, sortOrder: "asc" | "desc") =>
      updateParams({ sort: sortField, order: sortOrder }),
    page,
    setPage: (value: number) => updateParams({ page: String(value) }),
    pageSize,
    setPageSize: (value: number) => updateParams({ pageSize: String(value), page: null }),
  };
}
