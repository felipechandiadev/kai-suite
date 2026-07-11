import { BasicPageLayout } from "@kai/ui";
import { GetCompanyUseCase } from "@/features/settings-company/application/get-company.usecase";
import { ShareholderRequest } from "@/features/settings-shareholders/infrastructure/shareholder.request";
import { CompanySettingsContent } from "./CompanySettingsContent";

export default async function Page() {
  const company = await GetCompanyUseCase.execute();
  const shareholders =
    company?.id != null ? await ShareholderRequest.list(company.id) : [];

  return (
    <BasicPageLayout
      title="Empresa"
      className="min-w-0 w-full max-w-none"
      contentClassName="min-w-0 w-full max-w-full"
      data-test-id="settings-company-page"
    >
      {company == null ? (
        <p className="text-sm text-muted-foreground">No se pudo cargar la empresa. Revisa la sesión y el API.</p>
      ) : (
        <CompanySettingsContent company={company} shareholders={shareholders} />
      )}
    </BasicPageLayout>
  );
}
