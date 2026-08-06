import { GetCompanyUseCase } from "@/features/settings-company/application/get-company.usecase";
import { MenuQrPanel } from "./ui/MenuQrPanel";

export const dynamic = "force-dynamic";

export default async function KaiMenuQrPage() {
  const company = await GetCompanyUseCase.execute();
  const slugRaw = company?.settings?.menuPublicSlug;
  const menuPublicSlug =
    typeof slugRaw === "string" && slugRaw.trim() ? slugRaw.trim() : null;

  return <MenuQrPanel menuPublicSlug={menuPublicSlug} />;
}
