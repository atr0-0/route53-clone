"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";

export type RecordListItem = components["schemas"]["RecordListItem"];
export type RecordTypeMetadata = components["schemas"]["RecordTypeMetadata"];
export type RecordCreateBody = components["schemas"]["RecordCreate"];
export type RecordUpdateBody = components["schemas"]["RecordUpdate"];

export interface ListRecordsParams {
  zoneId: string;
  search?: string;
  types?: string[];
  routingPolicy?: string;
  alias?: boolean;
  page?: number;
  pageSize?: number;
}

const RECORDS_KEY = "records";
const RECORD_TYPES_KEY = "record-types";

export function useRecords(params: ListRecordsParams) {
  return useQuery({
    queryKey: [RECORDS_KEY, params],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/v1/hosted-zones/{zone_id}/records", {
        params: {
          path: { zone_id: params.zoneId },
          query: {
            search: params.search || undefined,
            type: params.types?.length ? params.types : undefined,
            routing_policy: params.routingPolicy || undefined,
            alias: params.alias,
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

export function useRecord(zoneId: string, recordId: string) {
  return useQuery({
    queryKey: [RECORDS_KEY, "detail", zoneId, recordId],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/v1/hosted-zones/{zone_id}/records/{record_id}", {
        params: { path: { zone_id: zoneId, record_id: recordId } },
      });
      if (error) throw error;
      return data;
    },
    enabled: Boolean(zoneId && recordId),
  });
}

// FR-D6: fetched once and cached — the create/edit forms render their inline
// validation from this payload, never a hand-duplicated grammar.
export function useRecordTypes() {
  return useQuery({
    queryKey: [RECORD_TYPES_KEY],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/v1/record-types");
      if (error) throw error;
      return data.items;
    },
    staleTime: Infinity,
  });
}

export function useCreateRecord(zoneId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: RecordCreateBody) => {
      const { data, error } = await apiClient.POST("/v1/hosted-zones/{zone_id}/records", {
        params: { path: { zone_id: zoneId } },
        body,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RECORDS_KEY] });
      queryClient.invalidateQueries({ queryKey: ["hosted-zones", "detail", zoneId] });
    },
  });
}

export function useUpdateRecord(zoneId: string, recordId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: RecordUpdateBody) => {
      const { data, error } = await apiClient.PATCH("/v1/hosted-zones/{zone_id}/records/{record_id}", {
        params: { path: { zone_id: zoneId, record_id: recordId } },
        body,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RECORDS_KEY] });
    },
  });
}

export function useDeleteRecord(zoneId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (recordId: string) => {
      const { error } = await apiClient.DELETE("/v1/hosted-zones/{zone_id}/records/{record_id}", {
        params: { path: { zone_id: zoneId, record_id: recordId } },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RECORDS_KEY] });
      queryClient.invalidateQueries({ queryKey: ["hosted-zones", "detail", zoneId] });
    },
  });
}

// FR-G4: atomic on the backend — a required record anywhere in the batch
// fails the whole request, matching the single-delete guard.
export function useBulkDeleteRecords(zoneId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (recordIds: string[]) => {
      const { error } = await apiClient.POST("/v1/hosted-zones/{zone_id}/records/bulk-delete", {
        params: { path: { zone_id: zoneId } },
        body: { recordIds },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RECORDS_KEY] });
      queryClient.invalidateQueries({ queryKey: ["hosted-zones", "detail", zoneId] });
    },
  });
}
