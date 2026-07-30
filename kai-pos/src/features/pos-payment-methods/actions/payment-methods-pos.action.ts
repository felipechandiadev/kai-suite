"use server";

import { PaymentMethodsPosRequest } from "../infrastructure/payment-methods-pos.request";

export async function getEffectivePosPaymentMethodsAction(input: {
  pointOfSaleId: string;
}) {
  return PaymentMethodsPosRequest.getEffective(input);
}
