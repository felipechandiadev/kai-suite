type CacheEntry<T> = {
  promise: Promise<T>;
  expiresAt: number;
};

export type DedupedAsyncFetch<TArgs extends unknown[], TResult> = ((
  ...args: TArgs
) => Promise<TResult>) & {
  invalidate: (...args: TArgs) => void;
  invalidateAll: () => void;
};

/**
 * Evita peticiones duplicadas en vuelo y reutiliza el resultado reciente (p. ej. React Strict Mode en dev).
 */
export function createDedupedAsyncFetch<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  options?: {
    ttlMs?: number;
    keyFn?: (...args: TArgs) => string;
  },
): DedupedAsyncFetch<TArgs, TResult> {
  const ttlMs = options?.ttlMs ?? 30_000;
  const keyFn = options?.keyFn ?? (() => "default");
  const cache = new Map<string, CacheEntry<TResult>>();

  const deduped = ((...args: TArgs): Promise<TResult> => {
    const key = keyFn(...args);
    const now = Date.now();
    const hit = cache.get(key);
    if (hit && hit.expiresAt > now) {
      return hit.promise;
    }
    const promise = fn(...args).catch((err) => {
      cache.delete(key);
      throw err;
    });
    cache.set(key, { promise, expiresAt: now + ttlMs });
    return promise;
  }) as DedupedAsyncFetch<TArgs, TResult>;

  deduped.invalidate = (...args: TArgs) => {
    cache.delete(keyFn(...args));
  };

  deduped.invalidateAll = () => {
    cache.clear();
  };

  return deduped;
}
