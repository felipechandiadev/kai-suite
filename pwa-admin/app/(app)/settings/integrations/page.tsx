import { BasicPageLayout } from "@kai/ui";
import { GetCompanyUseCase } from "@/features/settings-company/application/get-company.usecase";
import { getCompanyMercadoPagoSettingsAction } from "@/features/company-integrations/actions/companies-mercado-pago.action";
import {
  defaultCompanyMercadoPagoSettings,
  toMercadoPagoForm,
} from "@/features/company-integrations/types/company-mercado-pago.types";
import { IntegrationsSettingsForm } from "./IntegrationsSettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsIntegrationsPage() {
  const company = await GetCompanyUseCase.execute();
  if (!company?.id) {
    return (
      <BasicPageLayout title="Integraciones" subtitle="Pasarelas y hardware conectado">
        <p className="text-sm text-muted-foreground">No se pudo cargar la empresa.</p>
      </BasicPageLayout>
    );
  }

  const res = await getCompanyMercadoPagoSettingsAction(company.id);
  const initial = toMercadoPagoForm(
    res.success ? res.mercadoPagoSettings : defaultCompanyMercadoPagoSettings(),
  );

  return (
    <BasicPageLayout
      title="Integraciones"
      subtitle="Mercado Pago — cuenta compartida y terminal Point"
    >
      <IntegrationsSettingsForm companyId={company.id} initial={initial} />
    </BasicPageLayout>
  );
}
