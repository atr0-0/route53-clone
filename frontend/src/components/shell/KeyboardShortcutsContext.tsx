"use client";

import { createContext, useContext, useEffect, useState } from "react";

// FR-G5: `c` jumps to "the current screen's create route" — which route that
// is varies per page (zone list vs. records tab), so pages register their own
// target the same way they register breadcrumbs (BreadcrumbsContext.tsx).
interface KeyboardShortcutsContextValue {
  createHref: string | null;
  setCreateHref: (href: string | null) => void;
}

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextValue | null>(null);

export function KeyboardShortcutsProvider({ children }: { children: React.ReactNode }) {
  const [createHref, setCreateHref] = useState<string | null>(null);
  return (
    <KeyboardShortcutsContext.Provider value={{ createHref, setCreateHref }}>
      {children}
    </KeyboardShortcutsContext.Provider>
  );
}

/** Pages with a primary "Create X" action call this with their create route. */
export function useCreateShortcut(href: string | null) {
  const ctx = useContext(KeyboardShortcutsContext);
  useEffect(() => {
    ctx?.setCreateHref(href);
    return () => ctx?.setCreateHref(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [href]);
}

export function useCreateHref(): string | null {
  const ctx = useContext(KeyboardShortcutsContext);
  return ctx?.createHref ?? null;
}
