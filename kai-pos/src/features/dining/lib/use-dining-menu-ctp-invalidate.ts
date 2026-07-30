"use client";

import { useEffect, useRef } from "react";
import {
  useDiningBranchRealtime,
  type DiningSessionUpdatedPayload,
} from "@/features/dining/lib/use-dining-branch-realtime";

const DEFAULT_DEBOUNCE_MS = 400;

/**
 * Tras fire / cancel / cobro en la sucursal, invalida Cap. del menú
 * (complementa stock:updated por si la reserva falla o llega tarde).
 */
export function useDiningMenuCtpInvalidateOnSession(
  branchId: string,
  onInvalidate: () => void,
  options?: { enabled?: boolean; debounceMs?: number },
) {
  const enabled = options?.enabled !== false;
  const debounceMs = options?.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  const onInvalidateRef = useRef(onInvalidate);
  onInvalidateRef.current = onInvalidate;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSession = (payload: DiningSessionUpdatedPayload) => {
    if (payload.branchId !== branchId.trim()) return;
    const lines = payload.items ?? [];
    const affectsMaterials = lines.some((l) => {
      const s = String(l.kitchenStatus ?? "");
      return (
        s === "SENT" ||
        s === "PREPARING" ||
        s === "READY" ||
        s === "READY_FOR_PICKUP" ||
        s === "CANCELLED" ||
        s === "DRAFT"
      );
    });
    // También órdenes cerradas/cobradas (release + backflush).
    const status = String(payload.status ?? "");
    const orderAffects =
      status === "CLOSED" ||
      status === "CANCELLED" ||
      status === "BILLING" ||
      affectsMaterials ||
      lines.length === 0;

    if (!orderAffects) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      onInvalidateRef.current();
    }, debounceMs);
  };

  useDiningBranchRealtime(branchId, handleSession, {
    enabled: enabled && Boolean(branchId.trim()),
  });

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);
}
