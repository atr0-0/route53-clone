"use client";

import { useSyncExternalStore } from "react";
import { applyMode, Mode } from "@cloudscape-design/global-styles";

// FR-G1: near-free given invariant 9 (no custom CSS fights the mode switch).
// A small external store (same pattern as lib/notifications.ts) so both the
// one-time initializer (providers.tsx, applied before first paint everywhere,
// including /login) and the TopNavigation toggle (console shell only) share
// one source of truth without prop drilling.
const STORAGE_KEY = "route53clone-color-mode";

function resolveInitialMode(): Mode {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === Mode.Dark || stored === Mode.Light) return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? Mode.Dark : Mode.Light;
}

let currentMode: Mode = Mode.Light;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

/**
 * Called on mount, before the shell renders anything meaningful. Deliberately
 * idempotent rather than run-once-guarded: React 18 StrictMode's dev-mode
 * double-invoke of this effect was observed clearing the class applied by the
 * first call before the second (guarded) call could re-check it, leaving dark
 * mode never actually applied on load. Re-resolving and re-applying every
 * call sidesteps that — applyMode's classList toggle is a no-op if already
 * correct, so calling it twice in a row is harmless.
 */
export function initializeColorMode(): void {
  currentMode = resolveInitialMode();
  applyMode(currentMode);
  emit();
}

export function toggleColorMode(): void {
  currentMode = currentMode === Mode.Dark ? Mode.Light : Mode.Dark;
  applyMode(currentMode);
  window.localStorage.setItem(STORAGE_KEY, currentMode);
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): Mode {
  return currentMode;
}

function getServerSnapshot(): Mode {
  return Mode.Light;
}

export function useColorMode(): Mode {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
