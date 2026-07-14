/**
 * Delivery avanzado (zonas, mapa, agenda) — detrás de feature flag.
 * Fase 5 del plan: activar cuando ESHOP_DELIVERY_ADVANCED=true.
 */
export function isEshopDeliveryAdvancedEnabled(): boolean {
  return (
    process.env.ESHOP_DELIVERY_ADVANCED === 'true' ||
    process.env.ESHOP_DELIVERY_ADVANCED === '1'
  );
}

export type EShopDeliveryZone = {
  id: string;
  name: string;
  commune: string | null;
  shippingFee: number;
};

export type EShopDeliveryOccurrence = {
  id: string;
  startsAt: string;
  endsAt: string;
  shippingFee: number;
  available: boolean;
};

export type ResolvedDeliveryLocation = {
  line1: string;
  commune: string;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
  zoneId: string | null;
  shippingFee: number;
  occurrences: EShopDeliveryOccurrence[];
};
