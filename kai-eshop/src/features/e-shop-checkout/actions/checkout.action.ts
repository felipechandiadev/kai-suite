"use server";

import { randomUUID } from "crypto";
import { getEShopStoreSlug } from "@/lib/eshop-store-config";
import { getCustomerSessionToken } from "@/lib/eshop-customer-session";
import { getCartToken } from "@/lib/eshop-cart-session";
import { EShopRequest } from "@/features/e-shop-storefront/infrastructure/eshop.request";
import type { EShopFulfillmentMethodPublic } from "../types/checkout.types";

type CheckoutBody = {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  fulfillmentMethodId: string;
  address?: string;
  shippingAddress?: {
    line1?: string;
    commune?: string;
    region?: string;
    notes?: string;
  };
  lines?: Array<{ productVariantId: string; quantity: number }>;
  cartId?: string;
  cartToken?: string;
  checkoutAttemptId?: string;
  notes?: string;
  paymentMode?: "online" | "coordinate";
  deliveryZoneId?: string;
  deliveryOccurrenceId?: string;
  latitude?: number;
  longitude?: number;
  communeCode?: string;
};

async function withCartContext(body: CheckoutBody): Promise<CheckoutBody> {
  const cartToken = body.cartToken ?? (await getCartToken());
  return {
    ...body,
    cartToken: cartToken ?? undefined,
    checkoutAttemptId: body.checkoutAttemptId ?? randomUUID(),
  };
}

export async function fetchFulfillmentMethodsAction(subtotal: number) {
  return EShopRequest.get<EShopFulfillmentMethodPublic[]>(
    getEShopStoreSlug(),
    `/e-shop/fulfillment-methods?subtotal=${encodeURIComponent(String(subtotal))}`,
  );
}

export async function fetchPaymentSettingsAction() {
  return EShopRequest.get<{
    onlinePaymentEnabled: boolean;
    publicKey: string;
    environment: string;
    defaultPaymentMode: "online" | "coordinate";
  }>(getEShopStoreSlug(), "/e-shop/payment-settings");
}

export async function prepareCheckoutAction(body: CheckoutBody) {
  const sessionToken = await getCustomerSessionToken();
  return EShopRequest.post<{
    transactionId: string;
    documentNumber: string;
    payableTotal: number;
    paymentIntentId: string | null;
    preferenceId: string | null;
    publicKey: string | null;
    paymentMode: string;
    checkoutAttemptId?: string;
    cartId?: string | null;
  }>(
    getEShopStoreSlug(),
    "/e-shop/checkout/prepare",
    await withCartContext(body),
    sessionToken,
  );
}

export async function resumeCheckoutPaymentAction(orderId: string) {
  const sessionToken = await getCustomerSessionToken();
  return EShopRequest.post<{
    orderId: string;
    documentNumber: string | null;
    payableTotal: number;
    paymentIntentId: string;
    intentId: string;
    preferenceId: string;
    publicKey: string | null;
    mercadoPagoEnvironment: string | null;
    payerEmail: string;
    paymentMode: "online";
  }>(
    getEShopStoreSlug(),
    "/e-shop/checkout/resume-payment",
    { orderId },
    sessionToken,
  );
}

export async function submitCheckoutAction(body: CheckoutBody) {
  const sessionToken = await getCustomerSessionToken();
  return EShopRequest.post<{
    transactionId: string;
    documentNumber: string;
    total: number;
    fulfillmentStatus?: string;
    hasStockShortage?: boolean;
    checkoutAttemptId?: string;
    cartId?: string | null;
  }>(getEShopStoreSlug(), "/e-shop/checkout", await withCartContext(body), sessionToken);
}

export async function fetchCheckoutPaymentStatusAction(intentId: string) {
  const sessionToken = await getCustomerSessionToken();
  return EShopRequest.get<{
    id: string;
    status: string;
    amount: number;
  }>(
    getEShopStoreSlug(),
    `/e-shop/checkout/payment-status/${encodeURIComponent(intentId)}`,
    sessionToken,
  );
}

export async function confirmCheckoutPaymentAction(body: {
  intentId: string;
  token?: string;
  payerEmail: string;
  paymentMethodId?: string;
  paymentMethodType?: string;
  selectedPaymentMethod?: string;
  installments?: number;
}) {
  const sessionToken = await getCustomerSessionToken();
  return EShopRequest.post<{
    id: string;
    status: string;
    amount: number;
    awaitingWallet?: boolean;
  }>(getEShopStoreSlug(), "/e-shop/checkout/confirm-payment", body, sessionToken);
}

export async function getCheckoutProfilePrefillAction() {
  const sessionToken = await getCustomerSessionToken();
  if (!sessionToken) return null;
  try {
    const profile = await EShopRequest.get<{
      firstName: string;
      lastName: string | null;
      email: string;
      phone: string | null;
      address: string | null;
    }>(getEShopStoreSlug(), "/e-shop/me/profile", sessionToken);
    const name = [profile.firstName, profile.lastName].filter(Boolean).join(" ");
    return {
      name,
      email: profile.email,
      phone: profile.phone ?? "",
      address: profile.address ?? "",
    };
  } catch {
    return null;
  }
}
