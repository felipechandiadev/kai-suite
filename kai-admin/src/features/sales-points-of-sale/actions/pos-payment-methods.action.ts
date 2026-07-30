"use server";

import { revalidatePath } from "next/cache";
import { PosPaymentMethodsRequest } from "../infrastructure/pos-payment-methods.request";
import {
  type PosPaymentMethodConfig,
  type PosPaymentMethodDisplayBadge,
} from "../types/pos-payment-methods.types";

export async function getPosPaymentMethodsAction(posId: string) {
  return PosPaymentMethodsRequest.list(posId);
}

export async function replacePosPaymentMethodsAction(
  posId: string,
  paymentMethods: PosPaymentMethodConfig[],
) {
  const res = await PosPaymentMethodsRequest.replace(posId, paymentMethods);
  if (res.success) {
    revalidatePath("/sales/points-of-sale");
    revalidatePath(`/sales/points-of-sale/${posId}`);
  }
  return res;
}

export async function getEffectivePaymentMethodsForPosAction(
  pointOfSaleId: string,
) {
  return PosPaymentMethodsRequest.getEffective(pointOfSaleId);
}

/** Medios habilitados para la card (una sola petición, merge en backend). */
export async function getPosPaymentMethodsForCardAction(
  pointOfSaleId: string,
): Promise<
  | { success: true; badges: PosPaymentMethodDisplayBadge[] }
  | { success: false; error: string; badges: [] }
> {
  const posId = pointOfSaleId?.trim();
  if (!posId) {
    return { success: false, error: "Falta el punto de venta.", badges: [] };
  }
  const res = await PosPaymentMethodsRequest.getEffective(posId);
  if (!res.success) {
    return { success: false, error: res.error, badges: [] };
  }
  return {
    success: true,
    badges: res.paymentMethods.map((m) => ({
      companyPaymentMethodId: m.companyPaymentMethodId,
      label: m.label,
      alias: m.alias ?? null,
    })),
  };
}
