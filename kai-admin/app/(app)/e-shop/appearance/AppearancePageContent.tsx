import { unstable_noStore as noStore } from "next/cache";
import { getEShopThemeAction } from "@/features/e-shop-appearance/actions/eshop-theme.action";
import { EShopAppearanceForm } from "@/features/e-shop-appearance/ui/EShopAppearanceForm";

type Props = {
  companyId: string;
};

export default async function AppearancePageContent({ companyId }: Props) {
  noStore();
  const initial = await getEShopThemeAction(companyId);
  return <EShopAppearanceForm companyId={companyId} initial={initial} />;
}
