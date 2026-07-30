"use server";

import { diningLogin, type DiningAuthContext } from "@/lib/backend-api";
import { DiningRequest } from "../infrastructure/dining.request";

export type WaiterLoginResult = {
  userId: string;
  companyId: string;
  userName: string;
  email: string | null;
  displayName: string;
};

function ctx(body: { userId: string; companyId: string }): DiningAuthContext {
  return { userId: body.userId, companyId: body.companyId };
}

export async function waiterLoginAction(body: {
  userName: string;
  password: string;
  companyId: string;
}): Promise<WaiterLoginResult> {
  return diningLogin(body);
}

export async function listDiningRoomsAction(body: {
  userId: string;
  companyId: string;
}) {
  return DiningRequest.listRooms(ctx(body));
}

export async function getDiningRoomAction(body: {
  userId: string;
  companyId: string;
  roomId: string;
}) {
  return DiningRequest.getRoom(ctx(body), body.roomId);
}

export async function listActiveDiningOrdersAction(body: {
  userId: string;
  companyId: string;
  branchId?: string;
}) {
  return DiningRequest.listActiveOrders(ctx(body), body.branchId);
}

export async function getDiningOrderAction(body: {
  userId: string;
  companyId: string;
  orderId: string;
}) {
  return DiningRequest.getOrder(ctx(body), body.orderId);
}

export async function openTableOrderAction(body: {
  userId: string;
  companyId: string;
  branchId: string;
  diningTableId: string;
}) {
  return DiningRequest.openTable(ctx(body), {
    branchId: body.branchId,
    diningTableId: body.diningTableId,
  });
}

export async function getDiningNumberingSettingsAction(body: {
  userId: string;
  companyId: string;
  branchId: string;
}) {
  return DiningRequest.getNumberingSettings(ctx(body), body.branchId);
}

export async function resolveWaiterBranchCatalogContextAction(body: {
  userId: string;
  companyId: string;
  branchId: string;
}) {
  return DiningRequest.resolveBranchCatalogContext(ctx(body), body.branchId);
}

export async function searchWaiterMenuAction(body: {
  userId: string;
  companyId: string;
  priceListId: string;
  branchId?: string;
  pointOfSaleId?: string | null;
  query?: string;
  categoryIds?: string[];
  page?: number;
  pageSize?: number;
}) {
  return DiningRequest.searchPosMenuProducts(ctx(body), {
    priceListId: body.priceListId,
    branchId: body.branchId,
    pointOfSaleId: body.pointOfSaleId,
    query: body.query,
    categoryIds: body.categoryIds,
    page: body.page,
    pageSize: body.pageSize,
  });
}

export async function batchWaiterCtpAction(body: {
  userId: string;
  companyId: string;
  branchId: string;
  variantIds: string[];
}) {
  return DiningRequest.batchCtp(ctx(body), {
    branchId: body.branchId,
    variantIds: body.variantIds,
  });
}

export async function lookupWaiterVariantsAction(body: {
  userId: string;
  companyId: string;
  variantIds: string[];
  branchId?: string;
  priceListId?: string | null;
  pointOfSaleId?: string | null;
}) {
  return DiningRequest.lookupVariants(ctx(body), body);
}

export async function addOrderItemsAction(body: {
  userId: string;
  companyId: string;
  orderId: string;
  productVariantId: string;
  quantity?: number;
  notes?: string;
}) {
  return DiningRequest.addItems(ctx(body), body.orderId, [
    {
      productVariantId: body.productVariantId,
      quantity: body.quantity ?? 1,
      notes: body.notes,
    },
  ]);
}

export async function sendOrderToKitchenAction(body: {
  userId: string;
  companyId: string;
  orderId: string;
  lineIds?: string[];
}) {
  return DiningRequest.sendToKitchen(ctx(body), body.orderId, body.lineIds);
}

export async function requestOrderBillAction(body: {
  userId: string;
  companyId: string;
  orderId: string;
}) {
  return DiningRequest.requestBill(ctx(body), body.orderId);
}

export async function cancelOrderItemAction(body: {
  userId: string;
  companyId: string;
  orderId: string;
  lineId: string;
}) {
  return DiningRequest.cancelOrderItem(ctx(body), body.orderId, body.lineId);
}

export async function updateOrderLineNotesAction(body: {
  userId: string;
  companyId: string;
  orderId: string;
  lineId: string;
  notes: string | null;
}) {
  return DiningRequest.updateOrderLineNotes(
    ctx(body),
    body.orderId,
    body.lineId,
    body.notes,
  );
}

export async function markFireDeliveredAction(body: {
  userId: string;
  companyId: string;
  orderId: string;
  fireId: string;
}) {
  return DiningRequest.markFireDelivered(
    ctx(body),
    body.orderId,
    body.fireId,
  );
}

