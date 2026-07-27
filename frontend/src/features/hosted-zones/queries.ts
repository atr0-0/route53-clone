"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";

export type HostedZoneListItem = components["schemas"]["HostedZoneListItem"];
export type HostedZoneDetail = components["schemas"]["HostedZoneDetail"];
export type TagInput = components["schemas"]["TagInput"];

export interface ListHostedZonesParams {
  search?: string;
  type?: "PUBLIC" | "PRIVATE" | "";
  sort?: "name" | "recordCount" | "type" | "createdAt";
  order?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

const HOSTED_ZONES_KEY = "hosted-zones";

export function useHostedZones(params: ListHostedZonesParams) {
  return useQuery({
    queryKey: [HOSTED_ZONES_KEY, "list", params],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/v1/hosted-zones", {
        params: {
          query: {
            search: params.search || undefined,
            type: params.type || undefined,
            sort: params.sort,
            order: params.order,
            page: params.page,
            page_size: params.pageSize,
          },
        },
      });
      if (error) throw error;
      return data;
    },
    placeholderData: (previous) => previous,
  });
}

export function useHostedZone(zoneId: string) {
  return useQuery({
    queryKey: [HOSTED_ZONES_KEY, "detail", zoneId],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/v1/hosted-zones/{zone_id}", {
        params: { path: { zone_id: zoneId } },
      });
      if (error) throw error;
      return data;
    },
    enabled: Boolean(zoneId),
  });
}

export function useCreateHostedZone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name: string; type: "PUBLIC" | "PRIVATE"; description?: string; tags: TagInput[] }) => {
      const { data, error } = await apiClient.POST("/v1/hosted-zones", { body });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [HOSTED_ZONES_KEY, "list"] });
    },
  });
}

export function useUpdateHostedZone(zoneId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { description?: string | null; tags?: TagInput[] }) => {
      const { data, error } = await apiClient.PATCH("/v1/hosted-zones/{zone_id}", {
        params: { path: { zone_id: zoneId } },
        body,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData([HOSTED_ZONES_KEY, "detail", zoneId], data);
      queryClient.invalidateQueries({ queryKey: [HOSTED_ZONES_KEY, "list"] });
    },
  });
}
