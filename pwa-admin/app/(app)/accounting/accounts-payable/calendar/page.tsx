import { Suspense } from "react";
import { LoadingState } from "@kai/ui";
import AccountsPayableCalendarPageContent from "../AccountsPayableCalendarPageContent";

export const dynamic = "force-dynamic";

export default function AccountsPayableCalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <div
      className="flex h-full min-h-0 flex-1 flex-col overflow-hidden"
      data-test-id="accounting-accounts-payable-calendar-page"
    >
      <Suspense
        fallback={
          <LoadingState
            className="flex items-center justify-center py-4"
            data-test-id="accounts-payable-calendar-loading"
          />
        }
      >
        <AccountsPayableCalendarPageContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
