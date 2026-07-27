"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

// A separate "use client" boundary from (console)/layout.tsx's AppLayout — /login
// sits outside the (console) route group but still needs TanStack Query for the
// login mutation, so this wraps the whole app while the root layout itself stays
// a server component.
export function Providers({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
