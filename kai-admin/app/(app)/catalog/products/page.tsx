import { Suspense } from "react";
import { listProductsForGrid } from "@/features/inventory-products/actions/product.action";
import { listCategoriesForPage } from "@/features/inventory-categories/actions/category.action";
import { listBrandsForPage } from "@/features/catalog-brands/actions/brand.action";
import ProductsDataGrid from "./ui/ProductsDataGrid";
import { LoadingState } from "@kai/ui";

export const dynamic = "force-dynamic";

function parseSp(
  sp: Record<string, string | string[] | undefined>,
  key: string,
): string {
  const v = sp[key];
  if (Array.isArray(v)) {
    return typeof v[0] === "string" ? v[0] : "";
  }
  return typeof v === "string" ? v : "";
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(parseSp(sp, "page") || "1", 10) || 1);
  const limit = Math.min(
    500,
    Math.max(1, parseInt(parseSp(sp, "limit") || "25", 10) || 25),
  );
  const search = parseSp(sp, "search");
  const productType = parseSp(sp, "productType").trim() || undefined;
  const sortField = parseSp(sp, "sortField") || "name";
  const sortRaw = parseSp(sp, "sort");
  const sort = sortRaw === "desc" ? "desc" : "asc";

  const [result, categories, brands] = await Promise.all([
    listProductsForGrid({
      query: search,
      productType,
      categoryId: parseSp(sp, "categoryId").trim() || undefined,
      brandId: parseSp(sp, "brandId").trim() || undefined,
      status: parseSp(sp, "status").trim() || undefined,
      price: parseSp(sp, "price").trim() || undefined,
      cost: parseSp(sp, "cost").trim() || undefined,
      page,
      limit,
      sortField,
      sort,
    }),
    listCategoriesForPage(),
    listBrandsForPage(),
  ]);

  return (
    <div className="min-h-0 p-0" data-test-id="products-page-root">
      <Suspense
        fallback={
          <LoadingState
            className="flex items-center justify-center py-4"
            data-test-id="products-page-skeleton"
          />
        }
      >
        <ProductsDataGrid
          rows={result.rows}
          total={result.total}
          categories={categories}
          brands={brands}
        />
      </Suspense>
    </div>
  );
}
