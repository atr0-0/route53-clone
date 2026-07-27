"use client";

import { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { initializeColorMode } from "@/lib/theme";

// A separate "use client" boundary from (console)/layout.tsx's AppLayout — /login
// sits outside the (console) route group but still needs TanStack Query for the
// login mutation, so this wraps the whole app while the root layout itself stays
// a server component. Color mode is initialized here too (FR-G1) so /login gets
// the stored/preferred theme, not just the authenticated shell.
export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initializeColorMode();
  }, []);
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
