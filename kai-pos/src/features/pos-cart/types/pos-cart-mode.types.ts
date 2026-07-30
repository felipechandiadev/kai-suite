/** Modalidad del carrito en el POS. */
export type PosCartMode = "sale" | "return" | "fulfill_backorder";

/** Venta origen cuando el carrito está en modo devolución. */
export type LoadedReturnSaleMeta = {
  id: string;
  documentNumber: string;
  total: number;
  createdAt: string;
  /** True si la venta origen tenía cliente asociado (bloquea edición de cliente en devolución). */
  sourceHasCustomer?: boolean;
  /** Cantidad máxima devolvable por variante (vendido − devoluciones previas). */
  lineMaxReturnableQtyByVariantId: Record<string, number>;
};

/** Encargo/reserva abierta cargada para liquidar (venta + abono). */
export type LoadedBackorderMeta = {
  id: string;
  documentNumber: string;
  orderTotal: number;
  depositAvailable: number;
  createdAt: string;
  /** Cantidad máxima por variante según la reserva. */
  lineMaxQtyByVariantId: Record<string, number>;
};

/** Ticket de preventa cargado en caja para cobro. */
export type LoadedPresaleTicketMeta = {
  id: string;
  code: string;
  total: number;
  createdAt: string;
  lineMaxQtyByVariantId: Record<string, number>;
};
