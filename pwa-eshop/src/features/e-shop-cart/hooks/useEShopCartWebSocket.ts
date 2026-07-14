"use client";

import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import type { EShopCartUpdatedPayload } from "../types/cart.types";

function getCartWebSocketUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_BACKEND_API_URL?.trim() ||
    (process.env.NODE_ENV === "development" ? "http://localhost:5030" : "");
  if (!base) {
    throw new Error("NEXT_PUBLIC_BACKEND_API_URL no configurada");
  }
  return base.replace(/\/$/, "");
}

type Options = {
  cartId: string | null;
  cartToken: string | null;
  companyId: string | null;
  enabled?: boolean;
  onUpdate: (payload: EShopCartUpdatedPayload) => void;
};

export function useEShopCartWebSocket({
  cartId,
  cartToken,
  companyId,
  enabled = true,
  onUpdate,
}: Options): void {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (!enabled || !cartId || !cartToken || !companyId) return;

    let socket: Socket | null = null;

    socket = io(`${getCartWebSocketUrl()}/e-shop/cart`, {
      auth: { cartToken, companyId },
      transports: ["websocket", "polling"],
      withCredentials: true,
    });

    socket.on("cart.updated", (payload: EShopCartUpdatedPayload) => {
      if (!payload?.cart) return;
      onUpdateRef.current(payload);
    });

    return () => {
      socket?.removeAllListeners();
      socket?.disconnect();
    };
  }, [cartId, cartToken, companyId, enabled]);
}
