import { Suspense } from "react";
import { LoadingState } from "@kai/ui";
import { listCareTemplatesForPage } from "@/features/laundry-catalog/actions/laundry-catalog.action";
import { CareTemplatesCollection } from "./components/CareTemplatesCollection";

export const dynamic = "force-dynamic";

export default async function Page() {
  const initialTemplates = await listCareTemplatesForPage();

  return (
    <Suspense
      fallback={
        <LoadingState
          className="flex items-center justify-center p-4 md:p-6 py-4"
          data-test-id="laundry-care-page-skeleton"
        />
      }
    >
      <CareTemplatesCollection initialTemplates={initialTemplates} />
    </Suspense>
  );
}
