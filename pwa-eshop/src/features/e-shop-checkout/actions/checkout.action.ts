"use server";

import { getEShopStoreSlug } from "@/lib/eshop-store-config";
import { getCustomerSessionToken } from "@/lib/eshop-customer-session";
import { EShopRequest } from "@/features/e-shop-storefront/infrastructure/eshop.request";
import type { EShopFulfillmentMethodPublic } from "../types/checkout.types";

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

export async function prepareCheckoutAction(body: {
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
  lines: Array<{ productVariantId: string; quantity: number }>;
  notes?: string;
}) {
  const sessionToken = await getCustomerSessionToken();
  return EShopRequest.post<{
    transactionId: string;
    documentNumber: string;
    payableTotal: number;
    paymentIntentId: string | null;
    publicKey: string | null;
    paymentMode: string;
  }>(getEShopStoreSlug(), "/e-shop/checkout/prepare", body, sessionToken);
}

export async function confirmCheckoutPaymentAction(body: {
  intentId: string;
  token: string;
  payerEmail: string;
}) {
  const sessionToken = await getCustomerSessionToken();
  return EShopRequest.post<{
    id: string;
    status: string;
    amount: number;
  }>(getEShopStoreSlug(), "/e-shop/checkout/confirm-payment", body, sessionToken);
}

export async function submitCheckoutAction(body: {
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
  lines: Array<{ productVariantId: string; quantity: number }>;
  notes?: string;
}) {
  const sessionToken = await getCustomerSessionToken();
  return EShopRequest.post<{
    transactionId: string;
    documentNumber: string;
    total: number;
    fulfillmentStatus?: string;
    hasStockShortage?: boolean;
  }>(getEShopStoreSlug(), "/e-shop/checkout", body, sessionToken);
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
