import { BasicPageLayout } from "@/shared/components/layouts/BasicPageLayout";
import { getEShopMercadoPagoSettingsAction } from "@/features/e-shop-integrations/actions/eshop-mercado-pago.action";
import { defaultCompanyMercadoPagoSettings } from "@/features/company-integrations/types/company-mercado-pago.types";
import { EShopIntegrationsForm } from "./EShopIntegrationsForm";

export const dynamic = "force-dynamic";

export default async function EShopIntegrationsPage() {
  const res = await getEShopMercadoPagoSettingsAction();
  const initial = res.success
    ? res.mercadoPagoSettings
    : defaultCompanyMercadoPagoSettings();

  return (
    <BasicPageLayout
      title="Integraciones eShop"
      subtitle="Pago online en checkout (Mercado Pago Bricks)"
    >
      <EShopIntegrationsForm initial={initial} />
    </BasicPageLayout>
  );
}
