import { Suspense } from "react";
import { listSuppliersForGrid } from "@/features/purchasing-suppliers/actions/supplier.action";
import SuppliersDataGrid from "./ui/SuppliersDataGrid";
import { LoadingState } from '@kai/ui';

export const dynamic = "force-dynamic";

export default async function Page() {
  const result = await listSuppliersForGrid();

  return (
    <div className="min-h-0 p-0" data-test-id="suppliers-page-root">
      <Suspense
        fallback={
          <LoadingState className="flex items-center justify-center py-4" data-test-id="suppliers-page-skeleton" />
        }
      >
        <SuppliersDataGrid rows={result.rows} total={result.total} />
      </Suspense>
    </div>
  );
}
