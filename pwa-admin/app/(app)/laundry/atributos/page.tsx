import { Suspense } from "react";
import { LoadingState } from "@kai/ui";
import { listGarmentAttributesForPage } from "@/features/laundry-catalog/actions/laundry-catalog.action";
import { LaundryAttributesCollection } from "./components/LaundryAttributesCollection";

export const dynamic = "force-dynamic";

export default async function Page() {
  const initialAttributes = await listGarmentAttributesForPage();

  return (
    <Suspense
      fallback={
        <LoadingState
          className="flex items-center justify-center p-4 md:p-6 py-4"
          data-test-id="laundry-attributes-page-skeleton"
        />
      }
    >
      <LaundryAttributesCollection initialAttributes={initialAttributes} />
    </Suspense>
  );
}
