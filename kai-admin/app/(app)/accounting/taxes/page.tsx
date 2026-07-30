import { Suspense } from "react";
import { listTaxesForPage } from "@/features/accounting-taxes/actions/tax.action";
import { TaxesCollection } from "./components/TaxesCollection";
import { LoadingState } from '@kai/ui';

export const dynamic = "force-dynamic";

export default async function Page() {
  const initialTaxes = await listTaxesForPage();

  return (
    <Suspense
      fallback={
        <LoadingState className="flex items-center justify-center p-4 md:p-6 py-4" data-test-id="taxes-page-skeleton" />
      }
    >
      <TaxesCollection initialTaxes={initialTaxes} />
    </Suspense>
  );
}
