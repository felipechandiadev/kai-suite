import { CatalogSectionSkeleton } from "@/features/e-shop-catalog/components/CatalogSectionSkeleton";
import { Skeleton } from "@kai/ui";
import { StorePageShell } from "@/shared/components/StorePageShell";

export default function ProductosLoading() {
  return (
    <StorePageShell className="space-y-12">
      <Skeleton className="h-8 w-32 rounded-lg" />
      <CatalogSectionSkeleton />
    </StorePageShell>
  );
}
