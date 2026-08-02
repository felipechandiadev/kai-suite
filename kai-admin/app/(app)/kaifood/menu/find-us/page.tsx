import { BasicPageLayout } from "@kai/ui";
import { GetCompanyUseCase } from "@/features/settings-company/application/get-company.usecase";
import { MenuFindUsForm } from "./ui/MenuFindUsForm";
import { getMenuFindUsAction } from "@/features/kai-menu/actions/kai-menu.action";

export const dynamic = "force-dynamic";

export default async function KaiMenuFindUsPage() {
  const company = await GetCompanyUseCase.execute();
  if (!company?.id) {
    return <p className="text-sm text-muted-foreground">Empresa no disponible.</p>;
  }
  const initial = await getMenuFindUsAction(company.id);
  return (
    <BasicPageLayout title="Encuéntranos" subtitle="Ubicación y horarios en la carta pública.">
      <MenuFindUsForm companyId={company.id} initial={initial} />
    </BasicPageLayout>
  );
}
