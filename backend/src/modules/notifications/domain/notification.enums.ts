export enum NotificationSource {
  SYSTEM = 'SYSTEM',
  AUTOMATION = 'AUTOMATION',
  USER = 'USER',
}

export enum NotificationDomain {
  STOCK = 'STOCK',
  SALES = 'SALES',
  PURCHASING = 'PURCHASING',
  TREASURY = 'TREASURY',
  HR = 'HR',
  MESSAGING = 'MESSAGING',
  SYSTEM = 'SYSTEM',
  /** Cambios de catálogo / precios (POS refresh + alerta TopBar). */
  CATALOG = 'CATALOG',
}

export enum NotificationSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
}

export enum NotificationDeliveryStatus {
  UNREAD = 'UNREAD',
  READ = 'READ',
  ARCHIVED = 'ARCHIVED',
  DISMISSED = 'DISMISSED',
}

export enum NotificationAudienceType {
  ALL_COMPANY = 'ALL_COMPANY',
  ROLES = 'ROLES',
  USER_IDS = 'USER_IDS',
  BRANCH = 'BRANCH',
  STORAGE_SUBSCRIBERS = 'STORAGE_SUBSCRIBERS',
}

/** Stable kinds for stock (aligned with stock-alert.util). */
export const StockNotificationKind = {
  BELOW_MINIMUM: 'stock.below_minimum',
  ABOVE_MAXIMUM: 'stock.above_maximum',
  REORDER: 'stock.reorder',
} as const;

export const EShopNotificationKind = {
  ORDER_CREATED: 'eshop.order.created',
  ORDER_STATUS_CHANGED: 'eshop.order.status_changed',
} as const;

export const PricingNotificationKind = {
  UPDATED: 'pricing.updated',
} as const;

export type StockNotificationKindValue =
  (typeof StockNotificationKind)[keyof typeof StockNotificationKind];

export type PricingNotificationKindValue =
  (typeof PricingNotificationKind)[keyof typeof PricingNotificationKind];
