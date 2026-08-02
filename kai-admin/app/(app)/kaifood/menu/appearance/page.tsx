import { BasicPageLayout } from "@kai/ui";
import { GetCompanyUseCase } from "@/features/settings-company/application/get-company.usecase";
import { MenuAppearanceForm } from "./ui/MenuAppearanceForm";
import { getMenuThemeAction } from "@/features/kai-menu/actions/kai-menu.action";

export const dynamic = "force-dynamic";

export default async function KaiMenuAppearancePage() {
  const company = await GetCompanyUseCase.execute();
  if (!company?.id) {
    return <p className="text-sm text-muted-foreground">Empresa no disponible.</p>;
  }
  const initial = await getMenuThemeAction(company.id);
  return (
    <BasicPageLayout title="Apariencia" subtitle="Plantilla y tokens de color de KaiMenú.">
      <MenuAppearanceForm companyId={company.id} initial={initial} />
    </BasicPageLayout>
  );
}
