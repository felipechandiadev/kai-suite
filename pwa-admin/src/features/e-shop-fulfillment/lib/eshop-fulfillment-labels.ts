import type { EShopFulfillmentStatus } from "../types/eshop-fulfillment.types";

export const FULFILLMENT_STATUS_LABELS: Record<EShopFulfillmentStatus, string> = {
  SUBMITTED: "Recibido",
  CONFIRMED: "Confirmado",
  PREPARING: "En preparación",
  READY_FOR_PICKUP: "Listo para retiro",
  READY_FOR_DISPATCH: "Listo para despacho",
  IN_TRANSIT: "En ruta",
  SHIPPED: "Despachado",
  DELIVERED: "Entregado",
  ISSUE: "Con problema",
  CANCELLED: "Cancelado",
};

export const STOCK_POLICY_LABELS = {
  ALLOW_BACKORDER: "Permitir pedido igual (encargo si falta stock)",
  BLOCK_OUT_OF_STOCK: "Bloquear si no hay stock",
  IGNORE_STOCK: "No validar stock",
} as const;

export const METHOD_TYPE_LABELS = {
  PICKUP: "Retiro en tienda",
  LOCAL_DELIVERY: "Reparto local",
  FLAT_RATE: "Tarifa fija",
  FREE_OVER_THRESHOLD: "Gratis sobre umbral",
  MANUAL_QUOTE: "Coordinar envío",
} as const;

export const NEXT_STATUS_OPTIONS: Partial<Record<EShopFulfillmentStatus, EShopFulfillmentStatus[]>> = {
  SUBMITTED: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY_FOR_PICKUP", "READY_FOR_DISPATCH", "SHIPPED", "CANCELLED"],
  READY_FOR_PICKUP: ["DELIVERED", "CANCELLED"],
  READY_FOR_DISPATCH: ["IN_TRANSIT", "CANCELLED"],
  IN_TRANSIT: ["DELIVERED", "ISSUE", "CANCELLED"],
  SHIPPED: ["DELIVERED", "CANCELLED"],
  ISSUE: ["IN_TRANSIT", "DELIVERED", "CANCELLED"],
};
