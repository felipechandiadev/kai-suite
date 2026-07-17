import type { DiningOrderStatus, KitchenItemStatus } from "../types/dining-pos.types";

const ORDER_STATUS_LABELS: Record<DiningOrderStatus, string> = {
  FREE: "Libre",
  OPEN: "Abierta",
  SENT: "En cocina",
  PARTIAL_READY: "Parcial listo",
  READY: "Listo",
  BILLING: "Por cobrar",
  CLOSED: "Cerrada",
};

const KITCHEN_STATUS_LABELS: Record<KitchenItemStatus, string> = {
  DRAFT: "Borrador",
  SENT: "En cocina",
  PREPARING: "Preparando",
  READY: "Listo",
  SERVED: "Servido",
  CANCELLED: "Anulado",
};

export function diningOrderStatusLabel(status: DiningOrderStatus): string {
  return ORDER_STATUS_LABELS[status] ?? status;
}

export function kitchenItemStatusLabel(status: KitchenItemStatus): string {
  return KITCHEN_STATUS_LABELS[status] ?? status;
}
