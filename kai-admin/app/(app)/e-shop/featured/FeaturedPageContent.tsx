import { unstable_noStore as noStore } from "next/cache";
import {
  listFeaturedProductsAction,
  listProductsForFeaturedSearchAction,
} from "@/features/e-shop-featured/actions/featured.action";
import { getFeaturedSearchFromUrl } from "@/features/e-shop-featured/lib/parse-featured-search-url";
import { EShopFeaturedAdminPanel } from "./ui/EShopFeaturedAdminPanel";

export default async function FeaturedPageContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  noStore();
  const sp = await searchParams;
  const { q, page, pageSize } = getFeaturedSearchFromUrl(sp);

  const [initialFeatured, productSearch] = await Promise.all([
    listFeaturedProductsAction(),
    listProductsForFeaturedSearchAction({ query: q, page, pageSize }),
  ]);

  return (
    <EShopFeaturedAdminPanel
      initialFeatured={initialFeatured}
      productSearch={productSearch}
      searchQuery={q}
      searchPage={page}
    />
  );
}
