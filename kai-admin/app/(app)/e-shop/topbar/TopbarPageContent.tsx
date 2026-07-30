import { unstable_noStore as noStore } from "next/cache";
import { getEShopThemeAction } from "@/features/e-shop-appearance/actions/eshop-theme.action";
import { getEShopTopBarAction } from "@/features/e-shop-topbar/actions/eshop-topbar.action";
import { EShopTopBarAdminForm } from "@/features/e-shop-topbar/ui/EShopTopBarAdminForm";
import { listCategoriesForPage } from "@/features/inventory-categories/actions/category.action";

type Props = {
  companyId: string;
  companyName: string;
};

export default async function TopbarPageContent({ companyId, companyName }: Props) {
  noStore();
  const [initial, themeState, categories] = await Promise.all([
    getEShopTopBarAction(companyId),
    getEShopThemeAction(companyId),
    listCategoriesForPage(),
  ]);
  return (
    <EShopTopBarAdminForm
      companyId={companyId}
      companyName={companyName}
      themeResolved={themeState.resolved}
      initial={initial}
      categories={categories}
    />
  );
}
