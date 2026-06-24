import { EShopRequest } from "@/features/e-shop-storefront/infrastructure/eshop.request";
import { getEShopStoreSlug } from "@/lib/eshop-store-config";
import { RegistroForm } from "./RegistroForm";

export default async function RegistroPage() {
  const storefront = await EShopRequest.get<{ eShopRegistrationRequireRut?: boolean }>(
    getEShopStoreSlug(),
    "/e-shop/storefront",
  );
  return <RegistroForm requireRut={storefront.eShopRegistrationRequireRut === true} />;
}
