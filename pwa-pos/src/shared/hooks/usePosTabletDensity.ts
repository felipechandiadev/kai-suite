"use client";

import { useEffect, useState } from "react";
import { readPosTabletDensity } from "./pos-tablet-density";

/** Tablet POS táctil grande: estado + marca `html[data-pos-tablet]`. */
export function usePosTabletDensity(): boolean {
  const [tablet, setTablet] = useState(false);

  useEffect(() => {
    const sync = () => {
      const isTablet = readPosTabletDensity();
      setTablet(isTablet);
      document.documentElement.dataset.posTablet = isTablet ? "1" : "0";
    };
    sync();
    window.addEventListener("resize", sync);
    const coarseMq = window.matchMedia("(pointer: coarse)");
    coarseMq.addEventListener("change", sync);
    return () => {
      window.removeEventListener("resize", sync);
      coarseMq.removeEventListener("change", sync);
      delete document.documentElement.dataset.posTablet;
    };
  }, []);

  return tablet;
}
