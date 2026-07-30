/**
 * Snapshot de reparto local adjunto a una venta POS (`metadata.posDelivery`).
 */
export type PosDeliveryMetadata = {
  deliveryZoneId: string;
  deliveryOccurrenceId: string;
  address: string;
  communeCode: string;
  communeName?: string | null;
  region?: string | null;
  latitude: number;
  longitude: number;
  shippingFee: number;
  zoneName: string;
  notes?: string | null;
};

export function parsePosDeliveryMetadata(
  metadata: unknown,
): PosDeliveryMetadata | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const raw = (metadata as Record<string, unknown>).posDelivery;
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const deliveryZoneId =
    typeof o.deliveryZoneId === 'string' ? o.deliveryZoneId.trim() : '';
  const deliveryOccurrenceId =
    typeof o.deliveryOccurrenceId === 'string'
      ? o.deliveryOccurrenceId.trim()
      : '';
  const address = typeof o.address === 'string' ? o.address.trim() : '';
  const communeCode =
    typeof o.communeCode === 'string' ? o.communeCode.trim() : '';
  const zoneName = typeof o.zoneName === 'string' ? o.zoneName.trim() : '';
  const shippingFee = Number(o.shippingFee);
  const latitude = Number(o.latitude);
  const longitude = Number(o.longitude);
  if (
    !deliveryZoneId ||
    !deliveryOccurrenceId ||
    !address ||
    !communeCode ||
    !zoneName ||
    !Number.isFinite(shippingFee) ||
    shippingFee < 0 ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return null;
  }
  return {
    deliveryZoneId,
    deliveryOccurrenceId,
    address,
    communeCode,
    communeName:
      typeof o.communeName === 'string' ? o.communeName.trim() || null : null,
    region: typeof o.region === 'string' ? o.region.trim() || null : null,
    latitude,
    longitude,
    shippingFee: Math.round(shippingFee),
    zoneName,
    notes: typeof o.notes === 'string' ? o.notes.trim() || null : null,
  };
}
