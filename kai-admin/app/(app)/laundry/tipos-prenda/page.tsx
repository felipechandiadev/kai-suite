import { Suspense } from "react";
import { LoadingState } from "@kai/ui";
import { listGarmentTypesForPage } from "@/features/laundry-catalog/actions/laundry-catalog.action";
import { GarmentTypesCollection } from "./components/GarmentTypesCollection";

export const dynamic = "force-dynamic";

export default async function Page() {
  const initialTypes = await listGarmentTypesForPage();

  return (
    <Suspense
      fallback={
        <LoadingState
          className="flex items-center justify-center p-4 md:p-6 py-4"
          data-test-id="laundry-types-page-skeleton"
        />
      }
    >
      <GarmentTypesCollection initialTypes={initialTypes} />
    </Suspense>
  );
}
