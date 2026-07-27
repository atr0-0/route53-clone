"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";

export type RecordListItem = components["schemas"]["RecordListItem"];

export interface ListRecordsParams {
  zoneId: string;
  search?: string;
  types?: string[];
  page?: number;
  pageSize?: number;
}

// List-only (Slice 3, for the zone detail Records tab / AC-2). Create/update/
// delete/validation land in Slice 4 (session C) — see services/record_service.py.
export function useRecords(params: ListRecordsParams) {
  return useQuery({
    queryKey: ["records", params],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/v1/hosted-zones/{zone_id}/records", {
        params: {
          path: { zone_id: params.zoneId },
          query: {
            search: params.search || undefined,
            type: params.types?.length ? params.types : undefined,
            page: params.page,
            page_size: params.pageSize,
          },
        },
      });
      if (error) throw error;
      return data;
    },
    enabled: Boolean(params.zoneId),
    placeholderData: (previous) => previous,
  });
}
