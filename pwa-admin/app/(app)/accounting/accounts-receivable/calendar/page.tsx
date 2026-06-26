import { Suspense } from "react";
import LoadingState from "@/shared/components/LoadingState";
import AccountsReceivableCalendarPageContent from "../AccountsReceivableCalendarPageContent";

export const dynamic = "force-dynamic";

export default function AccountsReceivableCalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <div className="min-h-0 p-0" data-test-id="accounting-accounts-receivable-calendar-page">
      <Suspense
        fallback={
          <LoadingState
            className="flex items-center justify-center py-4"
            data-test-id="accounts-receivable-calendar-loading"
          />
        }
      >
        <AccountsReceivableCalendarPageContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
