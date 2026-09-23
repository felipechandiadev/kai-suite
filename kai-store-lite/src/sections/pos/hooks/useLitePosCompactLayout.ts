import { useEffect, useState } from "react";

/** Viewport angosto: tabs Productos | Carrito (mismo umbral aproximado que Suite). */
const COMPACT_MQ = "(max-width: 900px)";

export function useLitePosCompactLayout(): boolean {
  const [compact, setCompact] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(COMPACT_MQ).matches;
  });

  useEffect(() => {
    const mq = window.matchMedia(COMPACT_MQ);
    const onChange = () => setCompact(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return compact;
}
