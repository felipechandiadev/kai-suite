"use server";

import { PromotionsPosRequest } from "../infrastructure/promotions-pos.request";

export async function listEffectivePromotionsAction(input: {
  branchId: string;
  pointOfSaleId: string;
}) {
  return PromotionsPosRequest.listEffective(input);
}

export async function redeemPromotionCodeAction(input: {
  code: string;
  branchId: string;
  pointOfSaleId: string;
}) {
  return PromotionsPosRequest.redeem(input);
}
