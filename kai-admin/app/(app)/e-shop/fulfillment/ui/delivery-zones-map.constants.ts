import type { GeoJsonPolygon } from "@/features/e-shop-delivery/types/delivery.types";

export const MAULE_CENTER = { lat: -35.4264, lng: -71.6554 };
export const DEFAULT_MAP_ZOOM = 11;
export const DEFAULT_BBOX_OFFSET = 0.02;

export const ZONE_COLORS = [
  "#1e73ae",
  "#16a34a",
  "#ca8a04",
  "#dc2626",
  "#9333ea",
  "#0891b2",
] as const;

export function zoneColor(index: number): string {
  return ZONE_COLORS[index % ZONE_COLORS.length] ?? "#1e73ae";
}

export function defaultPolygon(center = MAULE_CENTER): GeoJsonPolygon {
  const { lat, lng } = center;
  const offset = DEFAULT_BBOX_OFFSET;
  return {
    type: "Polygon",
    coordinates: [
      [
        [lng - offset, lat - offset],
        [lng + offset, lat - offset],
        [lng + offset, lat + offset],
        [lng - offset, lat + offset],
        [lng - offset, lat - offset],
      ],
    ],
  };
}
