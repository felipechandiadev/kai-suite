"use server";

import { revalidatePath } from "next/cache";
import { DeliveryRequest } from "../infrastructure/delivery.request";
import type { GeoJsonPolygon } from "../types/delivery.types";

const PATH = "/reparto";

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
    revalidatePath(`${PATH}/configuracion`);
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

export async function saveDeliveryOccurrenceAction(body: {
  id?: string;
  name: string;
  kind?: "LOCAL_DELIVERY" | "PICKUP";
  occurrenceDate: string;
  departureTime: string;
  endTime?: string | null;
  orderCutoffTime: string;
  maxOrders?: number | null;
  driverUserId?: string | null;
  zoneIds?: string[];
  isCancelled?: boolean;
}) {
  try {
    const row = body.id
      ? await DeliveryRequest.updateOccurrence(body.id, body)
      : await DeliveryRequest.createOccurrence(body);
    revalidatePath(PATH);
    revalidatePath(`${PATH}/calendario`);
    revalidatePath(`${PATH}/repartos`);
    return { success: true as const, row };
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : "Error" };
  }
}

/** @deprecated Prefer `saveDeliveryOccurrenceAction`. */
export async function createDeliveryOccurrenceAction(body: {
  name: string;
  occurrenceDate: string;
  departureTime: string;
  orderCutoffTime: string;
  maxOrders?: number | null;
  zoneIds?: string[];
}) {
  return saveDeliveryOccurrenceAction(body);
}

export async function cancelDeliveryOccurrenceAction(id: string) {
  try {
    const row = await DeliveryRequest.cancelOccurrence(id);
    revalidatePath(PATH);
    revalidatePath(`${PATH}/calendario`);
    revalidatePath(`${PATH}/repartos`);
    return { success: true as const, row };
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function getDeliveryOperationsAction(params?: {
  date?: string;
  occurrenceId?: string | null;
  search?: string | null;
}) {
  try {
    const board = await DeliveryRequest.getOperationsBoard(params);
    return { success: true as const, board };
  } catch (e) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Error",
      board: null,
    };
  }
}

export async function listDeliveryDriversAction() {
  try {
    const rows = await DeliveryRequest.listDrivers();
    return { success: true as const, rows };
  } catch (e) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Error",
      rows: [] as Awaited<ReturnType<typeof DeliveryRequest.listDrivers>>,
    };
  }
}

export async function updateDeliveryOrderStatusAction(id: string, status: string) {
  try {
    await DeliveryRequest.updateOrderStatus(id, status);
    revalidatePath(PATH);
    revalidatePath(`${PATH}/repartos`);
    return { success: true as const };
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function assignDeliveryOccurrenceDriverAction(
  occurrenceId: string,
  driverUserId: string | null,
) {
  try {
    const result = await DeliveryRequest.assignOccurrenceDriver(occurrenceId, driverUserId);
    revalidatePath(PATH);
    revalidatePath(`${PATH}/repartos`);
    revalidatePath(`${PATH}/calendario`);
    return { success: true as const, result };
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function optimizeDeliveryOccurrenceRouteAction(occurrenceId: string) {
  try {
    const result = await DeliveryRequest.optimizeOccurrenceRoute(occurrenceId);
    revalidatePath(PATH);
    revalidatePath(`${PATH}/repartos`);
    return { success: true as const, result };
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function startDeliveryOccurrenceRouteAction(occurrenceId: string) {
  try {
    const result = await DeliveryRequest.startOccurrenceRoute(occurrenceId);
    revalidatePath(PATH);
    revalidatePath(`${PATH}/repartos`);
    return { success: true as const, result };
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function toggleDeliveryOrderLinePickedAction(
  orderId: string,
  lineId: string,
  isPicked: boolean,
) {
  try {
    const result = await DeliveryRequest.toggleOrderLinePicked(orderId, lineId, isPicked);
    revalidatePath(`${PATH}/repartos`);
    return { success: true as const, result };
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function pickAllDeliveryOrderLinesAction(
  orderId: string,
  advanceTo?: string | null,
) {
  try {
    const result = await DeliveryRequest.pickAllOrderLines(orderId, advanceTo);
    revalidatePath(`${PATH}/repartos`);
    return { success: true as const, result };
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
    revalidatePath(`${PATH}/repartos`);
    return { success: true as const, dispatch };
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function optimizeDeliveryRouteAction(dispatchId: string) {
  try {
    const result = await DeliveryRequest.optimizeRoute(dispatchId);
    revalidatePath(PATH);
    revalidatePath(`${PATH}/repartos`);
    return { success: true as const, result };
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : "Error" };
  }
}
