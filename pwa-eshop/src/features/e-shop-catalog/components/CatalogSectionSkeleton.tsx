import { Skeleton } from "@kai/ui";

const PRODUCT_CARD_COUNT = 8;

export function CatalogSectionSkeleton() {
  return (
    <section id="catalogo" className="scroll-mt-20 space-y-6" aria-busy="true" aria-label="Cargando catálogo">
      <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 md:items-end">
        <Skeleton className="h-11 w-full rounded-lg" />
        <Skeleton className="h-11 w-full rounded-lg" />
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: PRODUCT_CARD_COUNT }).map((_, index) => (
          <div key={index} className="flex flex-col gap-3">
            <Skeleton className="aspect-3/4 w-full rounded-xl" />
            <Skeleton className="h-4 w-3/4 rounded-md" />
            <Skeleton className="h-4 w-1/2 rounded-md" />
          </div>
        ))}
      </div>
    </section>
  );
}
