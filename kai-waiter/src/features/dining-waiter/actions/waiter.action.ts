"use server";

import { diningLogin } from "@/lib/backend-api";
import {
  clearWaiterAuthCookies,
  requireWaiterAuth,
  setWaiterAuthCookies,
} from "@/lib/waiter-auth.server";
import { DiningRequest } from "../infrastructure/dining.request";

export type WaiterLoginResult = {
  userId: string;
  companyId: string;
  userName: string;
  email: string | null;
  displayName: string;
};

/**
 * `userId`/`companyId` en el cuerpo de las acciones son legado de la UI y se IGNORAN:
 * la identidad sale siempre de la cookie httpOnly firmada (requireWaiterAuth).
 */
type LegacyIdentity = { userId?: string; companyId?: string };

export async function waiterLoginAction(body: {
  userName: string;
  password: string;
  companyId: string;
}): Promise<WaiterLoginResult> {
  const { tokens, ...session } = await diningLogin(body);
  await setWaiterAuthCookies(tokens);
  return session;
}

/** true si hay cookie firmada utilizable (refresca si hace falta). */
export async function hasWaiterAuthAction(): Promise<boolean> {
  try {
    await requireWaiterAuth();
    return true;
  } catch {
    return false;
  }
}

export async function waiterLogoutAction(): Promise<void> {
  await clearWaiterAuthCookies();
}

export async function listDiningRoomsAction(body: LegacyIdentity = {}) {
  return DiningRequest.listRooms(await requireWaiterAuth());
}

export async function getDiningRoomAction(body: LegacyIdentity & {
  roomId: string;
}) {
  return DiningRequest.getRoom(await requireWaiterAuth(), body.roomId);
}

export async function listActiveDiningOrdersAction(body: LegacyIdentity & {
  branchId?: string;
}) {
  return DiningRequest.listActiveOrders(await requireWaiterAuth(), body.branchId);
}

export async function getDiningOrderAction(body: LegacyIdentity & {
  orderId: string;
}) {
  return DiningRequest.getOrder(await requireWaiterAuth(), body.orderId);
}

export async function openTableOrderAction(body: LegacyIdentity & {
  branchId: string;
  diningTableId: string;
}) {
  return DiningRequest.openTable(await requireWaiterAuth(), {
    branchId: body.branchId,
    diningTableId: body.diningTableId,
  });
}

export async function getDiningNumberingSettingsAction(body: LegacyIdentity & {
  branchId: string;
}) {
  return DiningRequest.getNumberingSettings(await requireWaiterAuth(), body.branchId);
}

export async function resolveWaiterBranchCatalogContextAction(body: LegacyIdentity & {
  branchId: string;
}) {
  return DiningRequest.resolveBranchCatalogContext(await requireWaiterAuth(), body.branchId);
}

/** Búsqueda + CTP en una sola Server Action (el cliente las ejecuta en serie). */
export async function loadWaiterMenuPageAction(body: LegacyIdentity & {
  priceListId: string;
  branchId?: string;
  pointOfSaleId?: string | null;
  query?: string;
  categoryIds?: string[];
  page?: number;
  pageSize?: number;
}) {
  const auth = await requireWaiterAuth();
  const res = await DiningRequest.searchPosMenuProducts(auth, {
    priceListId: body.priceListId,
    branchId: body.branchId,
    pointOfSaleId: body.pointOfSaleId,
    query: body.query,
    categoryIds: body.categoryIds,
    page: body.page,
    pageSize: body.pageSize,
  });
  const ctpByVariantId: Record<string, number | null> = {};
  const branchId = body.branchId?.trim();
  if (branchId && res.products.length > 0) {
    try {
      const rows = await DiningRequest.batchCtp(auth, {
        branchId,
        variantIds: res.products.map((p) => p.variantId),
      });
      for (const row of rows) {
        ctpByVariantId[row.variantId] = row.producibleQty;
      }
    } catch {
      // CTP opcional: sin capacidad se muestra el stock normal.
    }
  }
  return { ...res, ctpByVariantId };
}

export async function lookupWaiterVariantsAction(body: LegacyIdentity & {
  variantIds: string[];
  branchId?: string;
  priceListId?: string | null;
  pointOfSaleId?: string | null;
}) {
  return DiningRequest.lookupVariants(await requireWaiterAuth(), body);
}

export async function addOrderItemsAction(body: LegacyIdentity & {
  orderId: string;
  productVariantId: string;
  quantity?: number;
  notes?: string;
}) {
  return DiningRequest.addItems(await requireWaiterAuth(), body.orderId, [
    {
      productVariantId: body.productVariantId,
      quantity: body.quantity ?? 1,
      notes: body.notes,
    },
  ]);
}

export async function listWaiterHostAddonsAction(body: LegacyIdentity & {
  hostProductId: string;
}) {
  return DiningRequest.listHostAddons(await requireWaiterAuth(), body.hostProductId);
}

export async function addOrderLineAddonAction(body: LegacyIdentity & {
  orderId: string;
  lineId: string;
  addonVariantId: string;
  quantity?: number;
}) {
  return DiningRequest.addLineAddon(await requireWaiterAuth(), body.orderId, body.lineId, {
    addonVariantId: body.addonVariantId,
    quantity: body.quantity ?? 1,
  });
}

export async function sendOrderToKitchenAction(body: LegacyIdentity & {
  orderId: string;
  lineIds?: string[];
}) {
  return DiningRequest.sendToKitchen(await requireWaiterAuth(), body.orderId, body.lineIds);
}

export async function requestOrderBillAction(body: LegacyIdentity & {
  orderId: string;
}) {
  return DiningRequest.requestBill(await requireWaiterAuth(), body.orderId);
}

export async function reopenOrderAction(body: LegacyIdentity & {
  orderId: string;
}) {
  return DiningRequest.reopenOrder(await requireWaiterAuth(), body.orderId);
}

export async function getCompanyTipSettingsAction(body: LegacyIdentity = {}) {
  const data = await DiningRequest.getTipSettings(await requireWaiterAuth());
  return data.tipSettings ?? null;
}

export async function cancelOrderItemAction(body: LegacyIdentity & {
  orderId: string;
  lineId: string;
}) {
  return DiningRequest.cancelOrderItem(await requireWaiterAuth(), body.orderId, body.lineId);
}

export async function updateOrderLineNotesAction(body: LegacyIdentity & {
  orderId: string;
  lineId: string;
  notes: string | null;
}) {
  return DiningRequest.updateOrderLineNotes(
    await requireWaiterAuth(),
    body.orderId,
    body.lineId,
    body.notes,
  );
}

export async function markFireDeliveredAction(body: LegacyIdentity & {
  orderId: string;
  fireId: string;
}) {
  return DiningRequest.markFireDelivered(
    await requireWaiterAuth(),
    body.orderId,
    body.fireId,
  );
}

export async function listKitchenProductionUnitsAction(body: LegacyIdentity & {
  branchId?: string;
}) {
  const rows = await DiningRequest.listProductionUnits(await requireWaiterAuth(), {
    branchId: body.branchId,
    purpose: "KITCHEN",
  });
  return rows.map((u) => {
    const mode =
      u.kitchenFulfillmentMode === "PRINTED"
        ? ("PRINTED" as const)
        : u.kitchenFulfillmentMode === "BOTH"
          ? ("BOTH" as const)
          : ("KDS" as const);
    return {
      id: u.id,
      name: u.name,
      code: u.code,
      kitchenFulfillmentMode: mode,
      kitchenPrintSettings: u.kitchenPrintSettings ?? null,
    };
  });
}

