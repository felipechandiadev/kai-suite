import type { ReactNode } from "react";
import { TabPageLayout } from "@kai/ui";
import { PurchasingTransactionsTabs } from "../ui/PurchasingTransactionsTabs";

export default function PurchasingTransactionsLayout({ children }: { children: ReactNode }) {
  return (
    <TabPageLayout
      tabs={<PurchasingTransactionsTabs />}
      className="min-h-0 flex-1"
      contentClassName="flex min-h-0 flex-1 flex-col"
      data-test-id="purchasing-transactions-layout"
    >
      {children}
    </TabPageLayout>
  );
}
