import { StorePageShell } from "@/shared/components/StorePageShell";
import { getCustomerPortalStorefront } from "@/features/e-shop-customer-account/lib/customer-portal-storefront";
import { CheckoutForm } from "./CheckoutForm";

export default async function CheckoutPage() {
  const storefront = await getCustomerPortalStorefront();

  return (
    <StorePageShell>
      <div className="mx-auto max-w-lg space-y-6">
        <h1 className="text-2xl font-semibold">Procesar pago</h1>
        <CheckoutForm
          customerPortalEnabled={storefront.eShopCustomerPortalEnabled === true}
          requireRut={storefront.eShopRegistrationRequireRut === true}
        />
      </div>
    </StorePageShell>
  );
}
