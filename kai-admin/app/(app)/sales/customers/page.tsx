import { Suspense } from "react";
import { listCustomersForPage } from "@/features/sales-customers/actions/customer.action";
import CustomersDataGrid from "./ui/CustomersDataGrid";
import { LoadingState } from '@kai/ui';

export const dynamic = "force-dynamic";

export default async function Page() {
  const result = await listCustomersForPage({ page: 1, pageSize: 50 });

  return (
    <div className="min-h-0 p-0" data-test-id="customers-page-root">
      <Suspense
        fallback={
          <LoadingState className="flex items-center justify-center py-4" data-test-id="customers-page-skeleton" />
        }
      >
        <CustomersDataGrid
          rows={result.customers}
          total={result.total}
          internalCreditEnabled={result.internalCreditEnabled === true}
        />
      </Suspense>
    </div>
  );
}
