export type PosDeliveryConfig = {
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
  occurrenceLabel?: string | null;
  notes?: string | null;
};

export function parsePosDeliveryConfig(value: unknown): PosDeliveryConfig | null {
  if (!value || typeof value !== "object") return null;
  const o = value as Record<string, unknown>;
  const deliveryZoneId =
    typeof o.deliveryZoneId === "string" ? o.deliveryZoneId.trim() : "";
  const deliveryOccurrenceId =
    typeof o.deliveryOccurrenceId === "string"
      ? o.deliveryOccurrenceId.trim()
      : "";
  const address = typeof o.address === "string" ? o.address.trim() : "";
  const communeCode =
    typeof o.communeCode === "string" ? o.communeCode.trim() : "";
  const zoneName = typeof o.zoneName === "string" ? o.zoneName.trim() : "";
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
      typeof o.communeName === "string" ? o.communeName.trim() || null : null,
    region: typeof o.region === "string" ? o.region.trim() || null : null,
    latitude,
    longitude,
    shippingFee: Math.round(shippingFee),
    zoneName,
    occurrenceLabel:
      typeof o.occurrenceLabel === "string"
        ? o.occurrenceLabel.trim() || null
        : null,
    notes: typeof o.notes === "string" ? o.notes.trim() || null : null,
  };
}
