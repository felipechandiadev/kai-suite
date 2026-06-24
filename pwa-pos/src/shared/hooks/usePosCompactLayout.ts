"use client";

import { useEffect, useState } from "react";
import { readPosCompactLayout } from "./pos-layout-breakpoint";

/** true = layout móvil (tabs, nav inferior). false = desktop (dos columnas, nav en top bar). */
export function usePosCompactLayout(): boolean {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const sync = () => setCompact(readPosCompactLayout());
    sync();
    window.addEventListener("resize", sync);
    const coarseMq = window.matchMedia("(pointer: coarse)");
    coarseMq.addEventListener("change", sync);
    return () => {
      window.removeEventListener("resize", sync);
      coarseMq.removeEventListener("change", sync);
    };
  }, []);

  return compact;
}
