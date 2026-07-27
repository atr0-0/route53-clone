"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateHref } from "@/components/shell/KeyboardShortcutsContext";

// FR-G5: `/` focus search, `c` create, `?` shortcut reference. `Esc` closes
// modals for free — Cloudscape's Modal already dismisses on Escape (UI spec
// §8: "Cloudscape already provides focus trapping... the requirement is not
// to break it"), so it isn't duplicated here.
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

export function useKeyboardShortcuts() {
  const router = useRouter();
  const createHref = useCreateHref();
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === "/") {
        const search = document.querySelector('input[type="search"]');
        if (search instanceof HTMLInputElement) {
          event.preventDefault();
          search.focus();
        }
      } else if (event.key === "c" && createHref) {
        event.preventDefault();
        router.push(createHref);
      } else if (event.key === "?") {
        event.preventDefault();
        setHelpOpen(true);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router, createHref]);

  return { helpOpen, setHelpOpen };
}
