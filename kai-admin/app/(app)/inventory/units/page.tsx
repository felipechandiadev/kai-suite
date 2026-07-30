import { Suspense } from "react";
import { listUnitsForPage } from "@/features/inventory-units/actions/unit.action";
import { UnitsCollection } from "./components/UnitsCollection";
import { LoadingState } from '@kai/ui';

export const dynamic = "force-dynamic";

export default async function Page() {
  const initialUnits = await listUnitsForPage();

  return (
    <Suspense
      fallback={
        <LoadingState className="flex items-center justify-center p-4 md:p-6 py-4" data-test-id="units-page-skeleton" />
      }
    >
      <UnitsCollection initialUnits={initialUnits} />
    </Suspense>
  );
}
