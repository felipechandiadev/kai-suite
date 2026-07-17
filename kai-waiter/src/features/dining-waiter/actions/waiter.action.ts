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

export async function searchWaiterMenuAction(body: {
  userId: string;
  companyId: string;
  query: string;
}) {
  return DiningRequest.searchMenuProducts(ctx(body), body.query);
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
