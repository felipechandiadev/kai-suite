import type { BadgeVariant } from "@kai/ui";

/** Ciclo de vida comercial del encargo (`metadata.backorder.reservationStatus`). */
export type BackorderReservationStatus =
  | "OPEN"
  | "FULFILLED"
  | "CANCELLED"
  | "EXPIRED"
  | "UNKNOWN";

export const BACKORDER_RESERVATION_STATUS_LABEL: Record<
  BackorderReservationStatus,
  string
> = {
  OPEN: "Abierto",
  FULFILLED: "Liquidado",
  CANCELLED: "Cancelado",
  EXPIRED: "Vencido",
  UNKNOWN: "—",
};

export function resolveBackorderReservationStatus(
  raw: string | null | undefined,
): BackorderReservationStatus {
  const s = raw?.trim().toUpperCase();
  if (s === "OPEN") return "OPEN";
  if (s === "FULFILLED") return "FULFILLED";
  if (s === "CANCELLED") return "CANCELLED";
  if (s === "EXPIRED") return "EXPIRED";
  return "UNKNOWN";
}

export function backorderReservationStatusBadgeVariant(
  status: BackorderReservationStatus,
): BadgeVariant {
  if (status === "FULFILLED") return "success-outlined";
  if (status === "OPEN") return "warning-outlined";
  if (status === "CANCELLED" || status === "EXPIRED") return "error-outlined";
  return "secondary-outlined";
}
