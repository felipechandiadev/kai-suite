"use client";

import { useEffect, useState } from "react";

/** Mismo breakpoint que sidebar / chrome compacto del POS (≤1025px). */
export function usePosCompactLayout(): boolean {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1025px)");
    const sync = () => setCompact(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return compact;
}
