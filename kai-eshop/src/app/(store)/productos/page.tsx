import { Suspense } from "react";
import { getCatalogAction } from "@/features/e-shop-catalog/actions/catalog.action";
import { CatalogSection } from "@/features/e-shop-catalog/components/CatalogSection";
import { CatalogSectionSkeleton } from "@/features/e-shop-catalog/components/CatalogSectionSkeleton";
import { StorePageShell } from "@/shared/components/StorePageShell";

type ProductosSearchParams = Promise<{
  search?: string;
  categoryId?: string;
  page?: string;
  limit?: string;
}>;

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return Math.floor(parsed);
}

async function CatalogContent({ searchParams }: { searchParams: ProductosSearchParams }) {
  const params = await searchParams;
  const search = params.search?.trim() ?? "";
  const categoryId = params.categoryId?.trim() ?? "";
  const page = parsePositiveInt(params.page, 1);
  const limit = Math.min(48, parsePositiveInt(params.limit, 24));

  const catalog = await getCatalogAction({
    page,
    limit,
    search: search || undefined,
    categoryId: categoryId || undefined,
  });

  return (
    <CatalogSection
      items={catalog.items}
      categories={catalog.categories}
      total={catalog.total}
      totalGeneral={catalog.totalGeneral}
    />
  );
}

export default function ProductosPage({ searchParams }: { searchParams: ProductosSearchParams }) {
  return (
    <StorePageShell className="space-y-12">
      <h1 className="text-2xl font-semibold">Productos</h1>

      <Suspense fallback={<CatalogSectionSkeleton />}>
        <CatalogContent searchParams={searchParams} />
      </Suspense>
    </StorePageShell>
  );
}
