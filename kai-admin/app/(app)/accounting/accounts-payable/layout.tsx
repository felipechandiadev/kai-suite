import type { ReactNode } from "react";
import { TabPageLayout } from "@kai/ui";
import { adminFillViewportBelowTopBarClassName } from "@kai/ui";
import { AccountsPayableTabs } from "./AccountsPayableTabs";

export default function AccountsPayableLayout({ children }: { children: ReactNode }) {
  return (
    <TabPageLayout
      title="Cuentas por pagar"
      tabs={<AccountsPayableTabs />}
      className={`min-h-0 ${adminFillViewportBelowTopBarClassName}`}
      contentClassName="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      compact
      data-test-id="accounting-accounts-payable-layout"
    >
      {children}
    </TabPageLayout>
  );
}
