"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AccountsPayableRow } from "@/features/accounting-accounts-payable/types/accounts-payable.types";
import AccountsPayableCalendar from "./AccountsPayableCalendar";
import CompleteAccountsPayablePaymentDialog from "./CompleteAccountsPayablePaymentDialog";
import AccountsPayablePaymentDetailsDialog from "./AccountsPayablePaymentDetailsDialog";

type Props = {
  rows: AccountsPayableRow[];
};

export default function AccountsPayableCalendarPanel({ rows }: Props) {
  const router = useRouter();
  const [payRow, setPayRow] = useState<AccountsPayableRow | null>(null);
  const [detailsRow, setDetailsRow] = useState<AccountsPayableRow | null>(null);

  return (
    <>
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <AccountsPayableCalendar
          rows={rows}
          onPay={(r) => setPayRow(r)}
          onDetails={(r) => setDetailsRow(r)}
        />
      </div>
      <CompleteAccountsPayablePaymentDialog
        open={Boolean(payRow)}
        row={payRow}
        onClose={() => setPayRow(null)}
        onSuccess={() => router.refresh()}
      />
      <AccountsPayablePaymentDetailsDialog
        open={Boolean(detailsRow)}
        row={detailsRow}
        onClose={() => setDetailsRow(null)}
      />
    </>
  );
}
