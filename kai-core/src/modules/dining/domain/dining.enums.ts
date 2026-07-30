export enum DiningOrderKind {
  TABLE = 'TABLE',
  COUNTER = 'COUNTER',
  TAKEAWAY = 'TAKEAWAY',
}

export enum DiningOrderStatus {
  FREE = 'FREE',
  OPEN = 'OPEN',
  SENT = 'SENT',
  PARTIAL_READY = 'PARTIAL_READY',
  READY = 'READY',
  BILLING = 'BILLING',
  CLOSED = 'CLOSED',
}

export enum KitchenItemStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  PREPARING = 'PREPARING',
  /** Listo en cocina; aún no llamado en Kai Board. */
  READY = 'READY',
  /** Listo para retirar; visible/anunciado en Kai Board. */
  READY_FOR_PICKUP = 'READY_FOR_PICKUP',
  SERVED = 'SERVED',
  CANCELLED = 'CANCELLED',
}

/** Pedido / tanda enviada a estación(es) de producción. */
export enum DiningStationOrderStatus {
  OPEN = 'OPEN',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum TableShape {
  RECT = 'RECT',
  CIRCLE = 'CIRCLE',
}

export enum LineSource {
  TABLE = 'TABLE',
  COUNTER = 'COUNTER',
  DELIVERY = 'DELIVERY',
  ESHOP = 'ESHOP',
}
