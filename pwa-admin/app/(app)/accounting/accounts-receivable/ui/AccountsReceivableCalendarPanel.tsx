"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import type { AccountsReceivableRow } from "@/features/accounting-accounts-receivable/types/accounts-receivable.types";
import AccountsReceivableCalendar from "./AccountsReceivableCalendar";
import CompleteAccountsReceivablePaymentDialog from "./CompleteAccountsReceivablePaymentDialog";
import AccountsReceivablePaymentDetailsDialog from "./AccountsReceivablePaymentDetailsDialog";
import AccountsReceivableGridFilters from "./AccountsReceivableGridFilters";

type Props = {
  rows: AccountsReceivableRow[];
};

export default function AccountsReceivableCalendarPanel({ rows }: Props) {
  const router = useRouter();
  const [payRow, setPayRow] = useState<AccountsReceivableRow | null>(null);
  const [detailsRow, setDetailsRow] = useState<AccountsReceivableRow | null>(null);

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0 border-b border-border px-1 py-2">
          <Suspense fallback={null}>
            <AccountsReceivableGridFilters />
          </Suspense>
        </div>
        <AccountsReceivableCalendar
          rows={rows}
          onPay={(r) => setPayRow(r)}
          onDetails={(r) => setDetailsRow(r)}
        />
      </div>
      <CompleteAccountsReceivablePaymentDialog
        open={Boolean(payRow)}
        row={payRow}
        onClose={() => setPayRow(null)}
        onSuccess={() => router.refresh()}
      />
      <AccountsReceivablePaymentDetailsDialog
        open={Boolean(detailsRow)}
        row={detailsRow}
        onClose={() => setDetailsRow(null)}
      />
    </>
  );
}
