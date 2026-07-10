import { Suspense } from "react";
import { listLedgerAccountsAction } from "@/features/accounting-ledgers/actions/accounting-ledger.action";
import LedgersDataGrid from "./ui/LedgersDataGrid";
import { LoadingState } from '@kai/ui';

export const dynamic = "force-dynamic";

function parseSp(sp: Record<string, string | string[] | undefined>, key: string): string {
  const v = sp[key];
  if (Array.isArray(v)) {
    return typeof v[0] === "string" ? v[0] : "";
  }
  return typeof v === "string" ? v : "";
}

export default async function LedgersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const inc = parseSp(sp, "includeInactive");
  const includeInactive = inc === "1" || inc === "true";

  const { accounts } = await listLedgerAccountsAction({ includeInactive });

  return (
    <div className="min-h-0 p-0" data-test-id="accounting-ledgers-page-root">
      <Suspense
        fallback={
          <LoadingState className="flex items-center justify-center py-4" data-test-id="ledgers-page-skeleton" />
        }
      >
        <LedgersDataGrid rows={accounts} includeInactive={includeInactive} />
      </Suspense>
    </div>
  );
}
