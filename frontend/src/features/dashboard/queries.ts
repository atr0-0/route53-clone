"use client";

import { useHostedZones } from "@/features/hosted-zones/queries";

// FR-F2: the Dashboard's counts come from data we already hold — no dedicated
// backend endpoint. One small request (sorted, page_size=5) drives the
// "recently created" table; one larger request sums recordCount client-side
// for the stat tiles. STATS_PAGE_SIZE is the backend's MAX_PAGE_SIZE
// (core/pagination.py) — comfortably covers the ~15-zone demo dataset
// (DR-10); the 1,000-zone NFR-8 dataset is never shipped in the demo.
const STATS_PAGE_SIZE = 100;
const RECENT_PAGE_SIZE = 5;

export function useDashboardStats() {
  const recent = useHostedZones({ sort: "createdAt", order: "desc", page: 1, pageSize: RECENT_PAGE_SIZE });
  const all = useHostedZones({ page: 1, pageSize: STATS_PAGE_SIZE });

  return {
    isLoading: recent.isLoading || all.isLoading,
    zoneCount: all.data?.total ?? 0,
    recordCount: all.data?.items.reduce((sum, zone) => sum + zone.recordCount, 0) ?? 0,
    // Mocked — no health-check table exists (03-assumptions-mocked-data-notes.md §1.2 item 11).
    healthCheckCount: 0,
    recentZones: recent.data?.items ?? [],
  };
}
