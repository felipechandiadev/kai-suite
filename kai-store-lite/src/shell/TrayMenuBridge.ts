import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import type { AppSection } from "@/config/routes";
import { activatePosSection } from "./activate-pos-section";
import { useSectionStore } from "./section-state.store";

const SECTION_EVENT = "kai-lite://section";

/** Tray puede enviar secciones legacy (`printers`); se mapean a admin. */
function normalizeSection(payload: string): AppSection | null {
  if (payload === "pos" || payload === "admin") return payload;
  if (payload === "printers") return "admin";
  return null;
}

export function useTrayMenuBridge(canAccessAdmin: boolean) {
  const setActive = useSectionStore((s) => s.setActive);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void listen<string>(SECTION_EVENT, (event) => {
      const section = normalizeSection(event.payload);
      if (!section) return;
      if (section === "admin" && !canAccessAdmin) return;
      if (section === "pos") {
        activatePosSection();
        return;
      }
      setActive(section);
    }).then((fn) => {
      unlisten = fn;
    });
    return () => {
      unlisten?.();
    };
  }, [setActive, canAccessAdmin]);
}

export const TrayMenuBridge = { SECTION_EVENT } as const;
