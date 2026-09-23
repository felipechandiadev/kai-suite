import { useEffect } from "react";
import type { AppSection } from "@/config/routes";
import { activatePosSection } from "./activate-pos-section";
import { useSectionStore } from "./section-state.store";

const SHORTCUTS: Record<string, AppSection> = {
  "1": "pos",
  "2": "admin",
};

export function useKeyboardSectionShortcuts(canAccessAdmin: boolean) {
  const setActive = useSectionStore((s) => s.setActive);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || !e.altKey) return;
      const section = SHORTCUTS[e.key];
      if (!section) return;
      if (section === "admin" && !canAccessAdmin) return;
      e.preventDefault();
      if (section === "pos") {
        activatePosSection();
        return;
      }
      setActive(section);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setActive, canAccessAdmin]);
}
