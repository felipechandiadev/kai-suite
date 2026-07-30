"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { io, type Socket } from "socket.io-client";
import { useSession } from "next-auth/react";
import { getClientBackendApiBase } from "@/lib/backend-api-url";
import type {
  CatalogInvalidatedPayload,
  CatalogRefreshListener,
} from "../lib/catalog-invalidation.types";

type CatalogRealtimeContextValue = {
  registerCatalogRefresh: (fn: CatalogRefreshListener) => () => void;
};

const CatalogRealtimeContext = createContext<CatalogRealtimeContextValue>({
  registerCatalogRefresh: () => () => {},
});

export function useCatalogRealtime() {
  return useContext(CatalogRealtimeContext);
}

function parsePayload(raw: unknown): CatalogInvalidatedPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const companyId = String(o.companyId ?? "").trim();
  const kindsRaw = o.kinds;
  if (!companyId || !Array.isArray(kindsRaw) || kindsRaw.length === 0) return null;
  const kinds = kindsRaw
    .map((k) => String(k))
    .filter(
      (k): k is CatalogInvalidatedPayload["kinds"][number] =>
        k === "RECIPE" || k === "PRICE" || k === "PRODUCT" || k === "VARIANT",
    );
  if (kinds.length === 0) return null;
  return {
    companyId,
    kinds,
    variantIds: Array.isArray(o.variantIds)
      ? o.variantIds.map((x) => String(x))
      : undefined,
    productIds: Array.isArray(o.productIds)
      ? o.productIds.map((x) => String(x))
      : undefined,
    priceListIds: Array.isArray(o.priceListIds)
      ? o.priceListIds.map((x) => String(x))
      : undefined,
    recipeId: o.recipeId != null ? String(o.recipeId) : undefined,
    at: String(o.at ?? new Date().toISOString()),
  };
}

export function PosCatalogRealtimeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const userId = session?.user?.accessToken ?? null;
  const activeCompanyId =
    (session?.user as { activeCompanyId?: string | null })?.activeCompanyId ?? null;
  const listenersRef = useRef(new Set<CatalogRefreshListener>());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<CatalogInvalidatedPayload | null>(null);

  const flush = useCallback(() => {
    const payload = pendingRef.current;
    pendingRef.current = null;
    if (!payload) return;
    for (const fn of listenersRef.current) {
      try {
        fn(payload);
      } catch {
        // ignore listener errors
      }
    }
  }, []);

  const enqueue = useCallback(
    (payload: CatalogInvalidatedPayload) => {
      const prev = pendingRef.current;
      if (!prev) {
        pendingRef.current = payload;
      } else {
        pendingRef.current = {
          companyId: payload.companyId,
          kinds: [...new Set([...prev.kinds, ...payload.kinds])],
          variantIds: [
            ...new Set([...(prev.variantIds ?? []), ...(payload.variantIds ?? [])]),
          ],
          productIds: [
            ...new Set([...(prev.productIds ?? []), ...(payload.productIds ?? [])]),
          ],
          priceListIds: [
            ...new Set([...(prev.priceListIds ?? []), ...(payload.priceListIds ?? [])]),
          ],
          recipeId: payload.recipeId ?? prev.recipeId,
          at: payload.at,
        };
      }
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        flush();
      }, 400);
    },
    [flush],
  );

  const registerCatalogRefresh = useCallback((fn: CatalogRefreshListener) => {
    listenersRef.current.add(fn);
    return () => {
      listenersRef.current.delete(fn);
    };
  }, []);

  useEffect(() => {
    const base = getClientBackendApiBase();
    if (!base || !userId) return;

    const socket: Socket = io(`${base}/realtime/catalog`, {
      transports: ["websocket"],
      auth: {
        userId,
        activeCompanyId: activeCompanyId ?? null,
      },
    });

    const onInvalidated = (raw: unknown) => {
      const payload = parsePayload(raw);
      if (payload) enqueue(payload);
    };
    socket.on("catalog:invalidated", onInvalidated);

    return () => {
      socket.off("catalog:invalidated", onInvalidated);
      socket.disconnect();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [userId, activeCompanyId, enqueue]);

  const value = useMemo(
    () => ({ registerCatalogRefresh }),
    [registerCatalogRefresh],
  );

  return (
    <CatalogRealtimeContext.Provider value={value}>
      {children}
    </CatalogRealtimeContext.Provider>
  );
}
