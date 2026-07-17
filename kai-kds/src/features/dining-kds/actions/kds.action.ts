"use server";

import { diningLogin, type DiningAuthContext } from "@/lib/backend-api";
import { DiningKdsRequest } from "../infrastructure/dining-kds.request";

export type KdsLoginResult = {
  userId: string;
  companyId: string;
  userName: string;
  email: string | null;
  displayName: string;
};

function ctx(body: { userId: string; companyId: string }): DiningAuthContext {
  return { userId: body.userId, companyId: body.companyId };
}

export async function kdsLoginAction(body: {
  userName: string;
  password: string;
  companyId: string;
}): Promise<KdsLoginResult> {
  return diningLogin(body);
}

export async function listProductionUnitsAction(body: {
  userId: string;
  companyId: string;
  branchId?: string;
}) {
  return DiningKdsRequest.listProductionUnits(ctx(body), body.branchId);
}

export async function getKitchenQueueAction(body: {
  userId: string;
  companyId: string;
  productionUnitId: string;
}) {
  return DiningKdsRequest.kitchenQueue(ctx(body), body.productionUnitId);
}

export async function markKitchenItemReadyAction(body: {
  userId: string;
  companyId: string;
  orderId: string;
  lineId: string;
}) {
  return DiningKdsRequest.markReady(ctx(body), body.orderId, body.lineId);
}
