"use server";

import { PosDeliveryRequest } from "../infrastructure/pos-delivery.request";

export async function fetchPosDeliveryCoverageAction() {
  return PosDeliveryRequest.coverage();
}

export async function geocodePosDeliveryAddressAction(body: {
  address: string;
  commune?: string;
  region?: string;
}) {
  return PosDeliveryRequest.geocode(body);
}

export async function resolvePosDeliveryZoneAction(body: {
  latitude?: number;
  longitude?: number;
  communeCode?: string;
  commune?: string;
}) {
  return PosDeliveryRequest.resolveZone(body);
}

export async function fetchPosDeliveryQuoteAction(
  zoneId: string,
  subtotal: number,
) {
  return PosDeliveryRequest.quote(zoneId, subtotal);
}

export async function fetchPosDeliveryOccurrencesAction(zoneId: string) {
  return PosDeliveryRequest.availableOccurrences(zoneId);
}
