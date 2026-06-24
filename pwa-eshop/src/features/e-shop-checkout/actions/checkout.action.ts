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
