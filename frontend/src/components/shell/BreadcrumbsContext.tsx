"use client";

import { createContext, useContext, useEffect, useState } from "react";

export interface BreadcrumbItem {
  text: string;
  href: string;
}

const DEFAULT_BREADCRUMBS: BreadcrumbItem[] = [{ text: "Route 53", href: "/hosted-zones" }];

interface BreadcrumbsContextValue {
  items: BreadcrumbItem[];
  setItems: (items: BreadcrumbItem[]) => void;
}

const BreadcrumbsContext = createContext<BreadcrumbsContextValue | null>(null);

export function BreadcrumbsProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<BreadcrumbItem[]>(DEFAULT_BREADCRUMBS);
  return (
    <BreadcrumbsContext.Provider value={{ items, setItems }}>{children}</BreadcrumbsContext.Provider>
  );
}

/** Pages call this with their own trail (FR-B22 — every segment navigable). */
export function useSetBreadcrumbs(items: BreadcrumbItem[]) {
  const ctx = useContext(BreadcrumbsContext);
  const key = items.map((item) => `${item.text}:${item.href}`).join("|");
  useEffect(() => {
    ctx?.setItems(items);
    return () => ctx?.setItems(DEFAULT_BREADCRUMBS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}

export function useBreadcrumbItems(): BreadcrumbItem[] {
  const ctx = useContext(BreadcrumbsContext);
  return ctx?.items ?? DEFAULT_BREADCRUMBS;
}
