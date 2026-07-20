import type { ReactNode } from "react";
import { TabPageLayout } from "@kai/ui";
import { OperatingExpensesTabs } from "./OperatingExpensesTabs";

export default function OperatingExpensesLayout({ children }: { children: ReactNode }) {
  return (
    <TabPageLayout
      title="Gastos de operación"
      compact
      tabs={<OperatingExpensesTabs />}
      className="min-h-0"
      headerClassName="pt-0"
      contentClassName="flex min-h-0 flex-1 flex-col"
      data-test-id="treasury-operating-expenses-layout"
    >
      {children}
    </TabPageLayout>
  );
}
