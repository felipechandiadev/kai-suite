import { GetCompanyUseCase } from "@/features/settings-company/application/get-company.usecase";
import { MenuAppearanceForm } from "./ui/MenuAppearanceForm";
import { getMenuThemeAction } from "@/features/kai-menu/actions/kai-menu.action";
import type { MenuThemeAdminState } from "@/features/kai-menu/types/menu-theme.types";

export const dynamic = "force-dynamic";

export default async function KaiMenuAppearancePage() {
  const company = await GetCompanyUseCase.execute();
  if (!company?.id) {
    return <p className="text-sm text-muted-foreground">Empresa no disponible.</p>;
  }
  const initial = (await getMenuThemeAction(company.id)) as MenuThemeAdminState;
  if (!initial?.presets?.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No se pudo cargar la apariencia de KaiMenú.
      </p>
    );
  }
  const menuPublicUrl =
    (process.env.NEXT_PUBLIC_KAI_MENU_URL || "").trim().replace(/\/$/, "") || null;
  return (
    <MenuAppearanceForm
      companyId={company.id}
      initial={initial}
      menuPublicUrl={menuPublicUrl}
    />
  );
}
