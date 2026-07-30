import { Suspense } from "react";
import { listBrandsForPage } from "@/features/catalog-brands/actions/brand.action";
import { BrandsCollection } from "./components/BrandsCollection";
import { LoadingState } from '@kai/ui';

export const dynamic = "force-dynamic";

export default async function Page() {
  const initialBrands = await listBrandsForPage();

  return (
    <Suspense
      fallback={
        <LoadingState className="flex items-center justify-center p-4 md:p-6 py-4" data-test-id="brands-page-skeleton" />
      }
    >
      <BrandsCollection initialBrands={initialBrands} />
    </Suspense>
  );
}
