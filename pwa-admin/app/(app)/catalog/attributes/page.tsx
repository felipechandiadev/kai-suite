import { Suspense } from "react";
import { listAttributesForPage } from "@/features/inventory-attributes/actions/attribute.action";
import { AttributesCollection } from "./components/AttributesCollection";
import { LoadingState } from '@kai/ui';

export const dynamic = "force-dynamic";

export default async function Page() {
  const initialAttributes = await listAttributesForPage();

  return (
    <Suspense
      fallback={
        <LoadingState className="flex items-center justify-center p-4 md:p-6 py-4" data-test-id="attributes-page-skeleton" />
      }
    >
      <AttributesCollection initialAttributes={initialAttributes} />
    </Suspense>
  );
}
