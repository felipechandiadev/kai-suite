"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Redirige anclas legacy del home a páginas dedicadas. */
export function LegacyHashRedirect() {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash === "#nosotros") {
      router.replace("/nosotros");
    }
  }, [router]);

  return null;
}
