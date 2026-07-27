"use client";

import { createContext, useContext, useEffect, useState } from "react";

// Matches the real Records tab's split panel (docs/reference/04-records-table.png:
// "N records selected" / "Select a record to see its details"). Threaded up to
// the console shell the same way BreadcrumbsContext works, since splitPanel is
// an AppLayout-level prop, not something a page can render directly.
interface SplitPanelValue {
  header: string;
  content: React.ReactNode;
}

interface SplitPanelContextValue {
  panel: SplitPanelValue | null;
  setPanel: (panel: SplitPanelValue | null) => void;
}

const SplitPanelContext = createContext<SplitPanelContextValue | null>(null);

export function SplitPanelProvider({ children }: { children: React.ReactNode }) {
  const [panel, setPanel] = useState<SplitPanelValue | null>(null);
  return (
    <SplitPanelContext.Provider value={{ panel, setPanel }}>{children}</SplitPanelContext.Provider>
  );
}

/**
 * Pages with a split panel call this with their current header/content, plus
 * a `key` identifying when the content should actually be considered changed
 * (e.g. the selected record IDs, joined). `content` is JSX — a new object on
 * every render — so it can't be an effect dependency itself: that would
 * either re-fire every render (risking a render loop through the parent's
 * setState) or, if omitted, go stale whenever the key doesn't change but the
 * caller's closure did (e.g. swapping which single record is selected while
 * the count, and therefore a naive header-only key, stays at one).
 */
export function useSetSplitPanel(panel: SplitPanelValue | null, key: string) {
  const ctx = useContext(SplitPanelContext);
  useEffect(() => {
    ctx?.setPanel(panel);
    return () => ctx?.setPanel(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}

export function useSplitPanel(): SplitPanelValue | null {
  const ctx = useContext(SplitPanelContext);
  return ctx?.panel ?? null;
}
