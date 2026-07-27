"use client";

import { useSyncExternalStore } from "react";

// A small module, not a state library (architecture §3.2) — a mutation on a
// detail page must be able to raise a Flashbar after navigating back to the
// list, so this can't live in that page's component state.
export interface FlashItem {
  id: string;
  type: "success" | "error" | "info";
  header?: string;
  content: string;
}

const EMPTY_ITEMS: FlashItem[] = [];
let items: FlashItem[] = EMPTY_ITEMS;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function pushFlash(item: Omit<FlashItem, "id">): void {
  const id = crypto.randomUUID();
  items = [...items, { ...item, id }];
  emit();
}

export function dismissFlash(id: string): void {
  items = items.filter((item) => item.id !== id);
  if (demoToastId === id) demoToastId = null;
  emit();
}

// Shared copy for every mocked/toast-only action across the revamped UI
// (dashboard feature cards, Register domain, Notifications, the two
// toast-only nav items) — one string, written once, matching the existing
// ComingSoon component's tone (components/ComingSoon.tsx).
const DEMO_LIMITATION_MESSAGE = "This is a demo — only Hosted zones and DNS records are fully functional here.";
const DEMO_TOAST_TTL_MS = 5000;

// Repeatedly clicking a mocked action (e.g. a nav item behind a toast) must not
// stack duplicate toasts — track the one currently showing and skip re-adding
// it. Auto-dismissed after DEMO_TOAST_TTL_MS so it never lingers or piles up.
let demoToastId: string | null = null;

export function pushDemoLimitationToast(): void {
  if (demoToastId !== null) return;
  const id = crypto.randomUUID();
  demoToastId = id;
  items = [...items, { id, type: "info", content: DEMO_LIMITATION_MESSAGE }];
  emit();
  if (typeof window !== "undefined") {
    window.setTimeout(() => dismissFlash(id), DEMO_TOAST_TTL_MS);
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): FlashItem[] {
  return items;
}

function getServerSnapshot(): FlashItem[] {
  // Must be referentially stable across calls — a fresh [] here triggers React's
  // "getServerSnapshot should be cached" warning and hydration mismatches.
  return EMPTY_ITEMS;
}

export function useFlashItems(): FlashItem[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
