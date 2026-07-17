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
  READY = 'READY',
  SERVED = 'SERVED',
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
