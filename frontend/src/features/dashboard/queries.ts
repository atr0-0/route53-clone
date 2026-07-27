"use client";

import { useHostedZones } from "@/features/hosted-zones/queries";

// FR-F2: the Dashboard's counts come from data we already hold — no dedicated
// backend endpoint. STATS_PAGE_SIZE is the backend's MAX_PAGE_SIZE
// (core/pagination.py) — comfortably covers the ~15-zone demo dataset
// (DR-10); the 1,000-zone NFR-8 dataset is never shipped in the demo.
//
// The real Route53 Dashboard (docs/reference/08-dashboard.png) doesn't show
// stat tiles or a recent-zones table at all — it's a 4-card feature overview
// plus mocked Register-domain/Notifications sections. This hook now exists
// only to surface the zone/record counts as a small aside within the DNS
// management card, since that's real data worth showing where it fits.
const STATS_PAGE_SIZE = 100;

export function useDashboardStats() {
  const all = useHostedZones({ page: 1, pageSize: STATS_PAGE_SIZE });

  return {
    isLoading: all.isLoading,
    zoneCount: all.data?.total ?? 0,
    recordCount: all.data?.items.reduce((sum, zone) => sum + zone.recordCount, 0) ?? 0,
  };
}
