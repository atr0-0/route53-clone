"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export const SESSION_QUERY_KEY = ["session"];

export function useSession() {
  return useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/v1/auth/me");
      if (error) throw error;
      return data;
    },
    retry: false,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const { data, error } = await apiClient.POST("/v1/auth/login", { body: credentials });
      if (error) throw error;
      return data;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(SESSION_QUERY_KEY, user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await apiClient.POST("/v1/auth/logout");
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.clear();
    },
  });
}
