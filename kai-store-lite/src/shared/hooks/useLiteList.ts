import { useCallback, useEffect, useState } from "react";
import { coreFetch } from "@/lib/http";
import { toUserMessage } from "@/lib/errors";

export type LiteListState<T> = {
  items: T[];
  loading: boolean;
  error: string | null;
  reload: () => void;
};

/** Fetches `{ items }` from a Lite endpoint; surfaces Core errors (no silent demo). */
export function useLiteList<T>(path: string): LiteListState<T> {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void coreFetch<{ items?: T[] }>(path)
      .then((r) => {
        if (!cancelled) {
          setItems(r.items ?? []);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setItems([]);
          setError(toUserMessage(e));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [path, tick]);

  return { items, loading, error, reload };
}
