import { redirect } from "next/navigation";
import { getCustomerSessionToken } from "@/lib/eshop-customer-session";
import { EShopCustomerAccountRequest } from "../infrastructure/customer-account.request";
import type { EShopCustomerProfile } from "../types/customer-account.types";

/** Valida el token con el backend. No modifica cookies (solo lectura en RSC). */
export async function getValidCustomerSessionToken(): Promise<string | null> {
  const token = await getCustomerSessionToken();
  if (!token) return null;
  try {
    await EShopCustomerAccountRequest.getProfile(token);
    return token;
  } catch {
    return null;
  }
}

export async function requireCustomerPortalSession(
  loginNext = "/cuenta",
): Promise<{ token: string; profile: EShopCustomerProfile }> {
  const token = await getCustomerSessionToken();
  if (!token) {
    redirect(`/cuenta/login?next=${encodeURIComponent(loginNext)}`);
  }
  try {
    const profile = await EShopCustomerAccountRequest.getProfile(token);
    return { token, profile };
  } catch {
    const loginUrl = `/cuenta/login?next=${encodeURIComponent(loginNext)}&session=expired`;
    redirect(
      `/api/eshop/clear-customer-session?next=${encodeURIComponent(loginUrl)}`,
    );
  }
}
