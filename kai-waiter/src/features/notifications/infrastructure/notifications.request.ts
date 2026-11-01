import {
  normalizeWaiterInboxItem,
  waiterInboxItemToRow,
} from "../lib/inbox-mapper";
import type {
  WaiterInboxItem,
  WaiterNotificationRow,
} from "../types/notification.types";
import {
  fetchInboxRawAction,
  fetchUnreadCountAction,
  markNotificationReadAction,
} from "../actions/notifications.action";

/*
 * `userId`/`companyId` se mantienen en la firma por compatibilidad con la UI,
 * pero se ignoran: la identidad la pone el servidor desde la cookie httpOnly.
 */

export async function fetchWaiterUnreadCount(
  _userId?: string,
  _companyId?: string,
): Promise<number> {
  try {
    return await fetchUnreadCountAction();
  } catch {
    return 0;
  }
}

export async function fetchWaiterDiningInbox(
  _userId?: string,
  _companyId?: string,
  limit = 30,
): Promise<WaiterNotificationRow[]> {
  try {
    const items = await fetchInboxRawAction(limit);
    return items
      .map((row) => normalizeWaiterInboxItem(row))
      .filter((x): x is WaiterInboxItem => x != null)
      .map((item) => waiterInboxItemToRow(item))
      .filter((x): x is WaiterNotificationRow => x != null);
  } catch {
    return [];
  }
}

export async function markWaiterNotificationRead(
  _userId: string | undefined,
  _companyId: string | undefined,
  deliveryId: string,
): Promise<boolean> {
  if (!deliveryId) return false;
  try {
    return await markNotificationReadAction(deliveryId);
  } catch {
    return false;
  }
}
