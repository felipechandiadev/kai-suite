import { Suspense } from "react";
import { LoadingState } from "@kai/ui";
import AccountsPayablePageContent from "./AccountsPayablePageContent";

export const dynamic = "force-dynamic";

export default function AccountsPayablePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <div
      className="flex h-full min-h-0 flex-1 flex-col overflow-hidden"
      data-test-id="accounting-accounts-payable-page"
    >
      <Suspense
        fallback={
          <LoadingState
            className="flex items-center justify-center py-4"
            data-test-id="accounts-payable-loading"
          />
        }
      >
        <AccountsPayablePageContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
