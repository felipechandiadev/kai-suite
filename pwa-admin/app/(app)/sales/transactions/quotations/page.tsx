import { Suspense } from "react";
import { listQuotationsAction } from "@/features/quotations/actions/quotations.action";
import QuotationsDataGrid from "./ui/QuotationsDataGrid";
import { LoadingState } from '@kai/ui';

export const dynamic = "force-dynamic";

export default async function Page() {
  const res = await listQuotationsAction();

  const rows = res.success ? res.items : [];
  const total = res.success ? res.total : 0;

  return (
    <div
      className="flex min-h-0 flex-1 flex-col p-0"
      data-test-id="sales-transactions-quotations-page-root"
    >
      <Suspense
        fallback={
          <LoadingState className="flex items-center justify-center py-4" data-test-id="sales-transactions-quotations-page-skeleton" />
        }
      >
        <QuotationsDataGrid rows={rows} total={total} />
      </Suspense>
      {!res.success ? (
        <p
          className="p-4 text-sm text-error"
          data-test-id="sales-transactions-quotations-page-error"
        >
          {res.error}
        </p>
      ) : null}
    </div>
  );
}
