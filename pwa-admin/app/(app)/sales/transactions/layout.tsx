import type { ReactNode } from "react";
import { TabPageLayout } from "@kai/ui";
import { SalesTransactionsTabs } from "./ui/SalesTransactionsTabs";

export default function SalesTransactionsLayout({ children }: { children: ReactNode }) {
  return (
    <TabPageLayout
      title="Transacciones de Venta"
      tabs={<SalesTransactionsTabs />}
      className="min-h-0 flex-1"
      contentClassName="flex min-h-0 flex-1 flex-col"
      compact
      data-test-id="sales-transactions-layout"
    >
      {children}
    </TabPageLayout>
  );
}
