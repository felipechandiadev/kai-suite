"use server";

import { revalidatePath } from "next/cache";
import { DeliveryRequest } from "../infrastructure/delivery.request";
import type { GeoJsonPolygon } from "../types/delivery.types";

const PATH = "/e-shop/fulfillment";

export async function getDeliverySettingsAction() {
  try {
    const settings = await DeliveryRequest.getSettings();
    return { success: true as const, settings };
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function updateDeliverySettingsAction(body: {
  depotLat?: number | null;
  depotLng?: number | null;
  depotAddress?: string | null;
  localDeliveryEnabled?: boolean;
  osrmUrl?: string | null;
}) {
  try {
    const settings = await DeliveryRequest.updateSettings(body);
    revalidatePath(PATH);
    return { success: true as const, settings };
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function listDeliveryCommunesAction() {
  try {
    const rows = await DeliveryRequest.listCommunes();
    return { success: true as const, rows };
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : "Error", rows: [] };
  }
}

export async function setDeliveryCommuneEnabledAction(id: string, isEnabled: boolean) {
  try {
    await DeliveryRequest.setCommuneEnabled(id, isEnabled);
    revalidatePath(PATH);
    revalidatePath(`${PATH}/cobertura`);
    return { success: true as const };
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function listDeliveryZonesAction() {
  try {
    const rows = await DeliveryRequest.listZones();
    return { success: true as const, rows };
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : "Error", rows: [] };
  }
}

export async function saveDeliveryZoneAction(body: {
  id?: string;
  name: string;
  shippingFee: number;
  isActive: boolean;
  communeCode?: string | null;
  geometry?: GeoJsonPolygon | null;
}) {
  try {
    const zone = await DeliveryRequest.saveZone(body);
    revalidatePath(PATH);
    revalidatePath(`${PATH}/zonas`);
    return { success: true as const, zone };
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function listDeliveryOccurrencesAction(from?: string, to?: string) {
  try {
    const rows = await DeliveryRequest.listOccurrences(from, to);
    return { success: true as const, rows };
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : "Error", rows: [] };
  }
}

export async function createDeliveryOccurrenceAction(body: {
  name: string;
  occurrenceDate: string;
  departureTime: string;
  orderCutoffTime: string;
  maxOrders?: number | null;
  zoneIds?: string[];
}) {
  try {
    const row = await DeliveryRequest.createOccurrence(body);
    revalidatePath(PATH);
    return { success: true as const, row };
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function getDeliveryOperationsAction() {
  try {
    const board = await DeliveryRequest.getOperationsBoard();
    return { success: true as const, board };
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : "Error", board: {} };
  }
}

export async function updateDeliveryOrderStatusAction(id: string, status: string) {
  try {
    await DeliveryRequest.updateOrderStatus(id, status);
    revalidatePath(PATH);
    return { success: true as const };
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function createDeliveryDispatchAction(body: {
  occurrenceId: string;
  driverUserId?: string | null;
}) {
  try {
    const dispatch = await DeliveryRequest.createDispatch(body);
    revalidatePath(PATH);
    return { success: true as const, dispatch };
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function optimizeDeliveryRouteAction(dispatchId: string) {
  try {
    const result = await DeliveryRequest.optimizeRoute(dispatchId);
    revalidatePath(PATH);
    return { success: true as const, result };
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : "Error" };
  }
}
