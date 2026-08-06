import { GetCompanyUseCase } from "@/features/settings-company/application/get-company.usecase";
import { MenuAboutForm } from "./ui/MenuAboutForm";
import { getMenuAboutAction } from "@/features/kai-menu/actions/kai-menu.action";

export const dynamic = "force-dynamic";

export default async function KaiMenuAboutPage() {
  const company = await GetCompanyUseCase.execute();
  if (!company?.id) {
    return <p className="text-sm text-muted-foreground">Empresa no disponible.</p>;
  }
  const initial = await getMenuAboutAction(company.id);
  return <MenuAboutForm companyId={company.id} initial={initial} />;
}
