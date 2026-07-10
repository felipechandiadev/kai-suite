import type { PosKind } from "@/features/session/lib/pos-context-storage";

export type OpenCashSessionSnapshot = {
  id: string;
  status: string;
  openedById: string;
  pointOfSaleId: string;
};

export type EvaluatePosEntryInput = {
  userId: string | null;
  pointOfSaleId: string | null;
  cashSessionId?: string | null;
  posKind?: PosKind | null;
  assignedPointOfSaleIds: string[];
  openSessionForPos?: OpenCashSessionSnapshot | null;
};

export type EvaluatePosEntryResult =
  | { valid: true }
  | { valid: false; reason: string };

export function evaluatePosEntry(input: EvaluatePosEntryInput): EvaluatePosEntryResult {
  const {
    userId,
    pointOfSaleId,
    cashSessionId,
    posKind,
    assignedPointOfSaleIds,
    openSessionForPos,
  } = input;

  if (!userId) {
    return { valid: false, reason: "No autenticado" };
  }

  const posId = pointOfSaleId?.trim() ?? "";
  if (!posId) {
    return { valid: false, reason: "Sin punto de venta en contexto" };
  }

  if (!assignedPointOfSaleIds.includes(posId)) {
    return { valid: false, reason: "Punto de venta no asignado a este usuario" };
  }

  const effectiveKind: PosKind = posKind === "PRESALE" ? "PRESALE" : "SALE";
  const sessionId = cashSessionId?.trim() || null;

  if (effectiveKind === "PRESALE") {
    if (sessionId) {
      return { valid: false, reason: "Preventa no debe tener sesión de caja" };
    }
    return { valid: true };
  }

  if (!sessionId) {
    return { valid: false, reason: "Sesión de caja requerida para venta" };
  }

  if (!openSessionForPos) {
    return { valid: false, reason: "No hay sesión de caja abierta en este punto de venta" };
  }

  if (openSessionForPos.id !== sessionId) {
    return { valid: false, reason: "La sesión de caja en contexto no coincide con la sesión abierta" };
  }

  if (openSessionForPos.status !== "OPEN") {
    return { valid: false, reason: "La sesión de caja no está abierta" };
  }

  if (openSessionForPos.pointOfSaleId !== posId) {
    return { valid: false, reason: "La sesión de caja no pertenece a este punto de venta" };
  }

  if (openSessionForPos.openedById !== userId) {
    return {
      valid: false,
      reason: "Esta sesión de caja fue abierta por otro usuario",
    };
  }

  return { valid: true };
}
