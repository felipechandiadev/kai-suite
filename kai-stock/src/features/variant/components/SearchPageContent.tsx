import { unstable_noStore as noStore } from "next/cache";
import { redirectToLoginServer } from "@/lib/auth/redirect-to-login";
import { searchVariantsAction } from "../actions/variant-search.action";
import { getVariantSearchFromUrl } from "../lib/parse-variant-search-url";
import VariantSearchPanel from "./VariantSearchPanel";

export default async function SearchPageContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  noStore();
  const sp = await searchParams;
  const { q, page, pageSize } = getVariantSearchFromUrl(sp);
  const variantSearch = await searchVariantsAction({ q, page, pageSize });
  if (variantSearch.unauthorized) {
    redirectToLoginServer();
  }

  return (
    <VariantSearchPanel variantSearch={variantSearch} searchQuery={q} searchPage={page} />
  );
}
