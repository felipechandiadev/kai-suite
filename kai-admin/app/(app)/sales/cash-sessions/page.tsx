import { Suspense } from "react";
import { listCashSessionsAction } from "@/features/sales-cash-sessions/actions/cash-sessions-list.action";
import CashSessionsDataGrid from "./ui/CashSessionsDataGrid";
import { LoadingState } from '@kai/ui';

export const dynamic = "force-dynamic";

export default async function Page() {
  const res = await listCashSessionsAction();

  const rows = res.success ? res.data.rows : [];
  const total = res.success ? res.data.total : 0;

  return (
    <div className="min-h-0 p-0" data-test-id="sales-cash-sessions-page-root">
      <Suspense
        fallback={
          <LoadingState className="flex items-center justify-center py-4" data-test-id="sales-cash-sessions-page-skeleton" />
        }
      >
        <CashSessionsDataGrid rows={rows} total={total} />
      </Suspense>
      {!res.success ? (
        <p
          className="p-4 text-sm text-error"
          data-test-id="sales-cash-sessions-page-error"
        >
          {res.error}
        </p>
      ) : null}
    </div>
  );
}

