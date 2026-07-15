"use server";

import { getEShopStoreSlug } from "@/lib/eshop-store-config";
import { EShopRequest } from "@/features/e-shop-storefront/infrastructure/eshop.request";
import type {
  DeliveryCoverageResponse,
  DeliveryGeocodeResult,
  DeliveryOccurrenceOption,
  DeliveryQuoteResult,
  ResolvedDeliveryZone,
} from "../types/delivery.types";

export async function fetchDeliveryCoverageAction() {
  return EShopRequest.get<DeliveryCoverageResponse>(getEShopStoreSlug(), "/delivery/public/coverage");
}

export async function geocodeDeliveryAddressAction(body: {
  address: string;
  commune?: string;
  region?: string;
}) {
  return EShopRequest.post<DeliveryGeocodeResult>(
    getEShopStoreSlug(),
    "/delivery/public/geocode",
    body,
  );
}

export async function resolveDeliveryZoneAction(body: {
  latitude?: number;
  longitude?: number;
  communeCode?: string;
  commune?: string;
}) {
  return EShopRequest.post<{ zone: ResolvedDeliveryZone | null; covered: boolean }>(
    getEShopStoreSlug(),
    "/delivery/public/resolve-zone",
    body,
  );
}

export async function fetchDeliveryQuoteAction(zoneId: string, subtotal: number) {
  return EShopRequest.get<DeliveryQuoteResult>(
    getEShopStoreSlug(),
    `/delivery/public/quote?zoneId=${encodeURIComponent(zoneId)}&subtotal=${encodeURIComponent(String(subtotal))}`,
  );
}

export async function fetchDeliveryOccurrencesAction(zoneId: string) {
  return EShopRequest.get<DeliveryOccurrenceOption[]>(
    getEShopStoreSlug(),
    `/delivery/public/available-occurrences?zoneId=${encodeURIComponent(zoneId)}`,
  );
}
