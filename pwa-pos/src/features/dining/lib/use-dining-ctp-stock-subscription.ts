"use client";

import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import { useSession } from "next-auth/react";
import { getClientBackendApiBase } from "@/lib/backend-api-url";

type StockUpdatedPayload = {
  storageId?: string;
  productVariantId?: string;
};

/**
 * Suscribe al namespace `/realtime/stock` para refrescar CTP del menú dining.
 */
export function useDiningCtpStockSubscription(
  storageIds: string[],
  onStockUpdated: () => void,
  options?: { enabled?: boolean },
) {
  const enabled = options?.enabled !== false;
  const { data: session } = useSession();
  const userId = session?.user?.accessToken ?? null;
  const activeCompanyId =
    (session?.user as { activeCompanyId?: string | null })?.activeCompanyId ?? null;
  const onUpdatedRef = useRef(onStockUpdated);
  onUpdatedRef.current = onStockUpdated;
  const storageKey = storageIds.filter(Boolean).sort().join(",");

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const base = getClientBackendApiBase();
    if (!base || !userId || !storageKey) {
      return;
    }
    const ids = storageKey.split(",").filter(Boolean);
    if (ids.length === 0) return;

    const socket: Socket = io(`${base}/realtime/stock`, {
      transports: ["websocket"],
      auth: {
        userId,
        activeCompanyId: activeCompanyId ?? null,
      },
    });

    const subscribe = () => {
      socket.emit("subscribeStorages", { storageIds: ids });
    };

    socket.on("connect", subscribe);
    if (socket.connected) {
      subscribe();
    }

    const onUpdated = (payload: StockUpdatedPayload) => {
      const sid = payload.storageId?.trim();
      if (sid && ids.includes(sid)) {
        onUpdatedRef.current();
      }
    };
    socket.on("stock:updated", onUpdated);

    return () => {
      socket.off("stock:updated", onUpdated);
      socket.off("connect", subscribe);
      socket.disconnect();
    };
  }, [userId, activeCompanyId, storageKey, enabled]);
}
