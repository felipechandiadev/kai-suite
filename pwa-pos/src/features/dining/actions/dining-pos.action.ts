"use server";

import { DiningPosRequest } from "../infrastructure/dining-pos.request";
import type { DiningOrderKind, PosDiningMenuGroup } from "../types/dining-pos.types";

export async function listPosDiningOrdersAction(input: {
  branchId?: string;
  kind?: DiningOrderKind;
}) {
  return DiningPosRequest.listOrders(input);
}

export async function getPosDiningOrderAction(orderId: string) {
  return DiningPosRequest.getOrder(orderId);
}

export async function listPosDiningRoomsAction(branchId?: string) {
  return DiningPosRequest.listRooms(branchId);
}

export async function openPosCounterOrderAction(branchId: string) {
  return DiningPosRequest.openCounter(branchId);
}

export async function openPosTakeawayOrderAction(branchId: string) {
  return DiningPosRequest.openTakeaway(branchId);
}

export async function transferCartLineToDiningOrderAction(input: {
  diningOrderId: string;
  productVariantId: string;
  quantity: number;
  notes?: string;
}) {
  return DiningPosRequest.transferCartLine(input);
}

export async function addPosDiningOrderItemsAction(
  orderId: string,
  items: Array<{ productVariantId: string; quantity: number; notes?: string }>,
) {
  return DiningPosRequest.addOrderItems(orderId, items);
}

export async function updatePosDiningOrderProfileAction(
  orderId: string,
  input: { customerName?: string },
) {
  return DiningPosRequest.updateOrderProfile(orderId, input);
}

export async function sendPosDiningOrderToKitchenAction(orderId: string) {
  return DiningPosRequest.sendToKitchen(orderId);
}

export async function requestPosDiningBillAction(orderId: string) {
  return DiningPosRequest.requestBill(orderId);
}

export async function closePosDiningOrderAction(input: {
  orderId: string;
  linkedTransactionId?: string;
}) {
  return DiningPosRequest.closeOrder(input.orderId, input.linkedTransactionId);
}

export async function searchPosDiningMenuAction(input: {
  query: string;
  group: PosDiningMenuGroup;
}) {
  return DiningPosRequest.searchMenu(input);
}
