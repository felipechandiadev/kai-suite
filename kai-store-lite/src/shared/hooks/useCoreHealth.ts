import { useEffect, useState } from "react";
import { liteFetch } from "@/lib/lite-client";

export type CoreHealth = {
  ok: boolean;
  edition?: string;
  version?: string;
  message?: string;
};

export function useCoreHealth(pollMs = 5000) {
  const [health, setHealth] = useState<CoreHealth>({ ok: false, message: "checking…" });

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await liteFetch<CoreHealth>("/lite/health", { skipAuth: true });
        if (!cancelled) setHealth({ ...res, ok: true });
      } catch (e) {
        if (!cancelled) {
          setHealth({
            ok: false,
            message: e instanceof Error ? e.message : "Core offline",
          });
        }
      }
    };
    void tick();
    const id = window.setInterval(() => void tick(), pollMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [pollMs]);

  return health;
}
