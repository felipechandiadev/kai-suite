import { EShopRequest } from "@/features/e-shop-storefront/infrastructure/eshop.request";
import { getEShopStoreSlug } from "@/lib/eshop-store-config";

export type CustomerPortalStorefront = {
  eShopCustomerPortalEnabled?: boolean;
  eShopRegistrationRequireRut?: boolean;
};

export async function getCustomerPortalStorefront(): Promise<CustomerPortalStorefront> {
  return EShopRequest.get<CustomerPortalStorefront>(getEShopStoreSlug(), "/e-shop/storefront");
}

export async function requireCustomerPortalEnabled(): Promise<CustomerPortalStorefront | null> {
  const storefront = await getCustomerPortalStorefront();
  if (storefront.eShopCustomerPortalEnabled !== true) {
    return null;
  }
  return storefront;
}
