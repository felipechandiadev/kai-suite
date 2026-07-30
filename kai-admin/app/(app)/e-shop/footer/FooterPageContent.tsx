import { unstable_noStore as noStore } from "next/cache";
import { getEShopThemeAction } from "@/features/e-shop-appearance/actions/eshop-theme.action";
import { getEShopFooterAction } from "@/features/e-shop-footer/actions/eshop-footer.action";
import { EShopFooterAdminForm } from "@/features/e-shop-footer/ui/EShopFooterAdminForm";

type Props = {
  companyId: string;
  companyName: string;
};

export default async function FooterPageContent({ companyId, companyName }: Props) {
  noStore();
  const [initial, themeState] = await Promise.all([
    getEShopFooterAction(companyId),
    getEShopThemeAction(companyId),
  ]);
  return (
    <EShopFooterAdminForm
      companyId={companyId}
      companyName={companyName}
      themeResolved={themeState.resolved}
      initial={initial}
    />
  );
}
