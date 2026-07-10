import { Suspense } from "react";
import { LoadingState } from "@kai/ui";
import AccountsReceivablePageContent from "./AccountsReceivablePageContent";

export const dynamic = "force-dynamic";

export default function AccountsReceivablePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <div className="min-h-0 p-0" data-test-id="accounting-accounts-receivable-page">
      <Suspense
        fallback={
          <LoadingState
            className="flex items-center justify-center py-4"
            data-test-id="accounts-receivable-loading"
          />
        }
      >
        <AccountsReceivablePageContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
