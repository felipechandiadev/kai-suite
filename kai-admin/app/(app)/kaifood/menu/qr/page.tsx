import { GetCompanyUseCase } from "@/features/settings-company/application/get-company.usecase";
import { resolveKaiMenuPublicUrl } from "@/config/kai-menu-url";
import { MenuQrPanel } from "./ui/MenuQrPanel";

export const dynamic = "force-dynamic";

export default async function KaiMenuQrPage() {
  const company = await GetCompanyUseCase.execute();
  const slugRaw = company?.settings?.menuPublicSlug;
  const menuPublicSlug =
    typeof slugRaw === "string" && slugRaw.trim() ? slugRaw.trim() : null;

  return (
    <MenuQrPanel
      menuPublicUrl={resolveKaiMenuPublicUrl()}
      menuPublicSlug={menuPublicSlug}
    />
  );
}
