import type { ReactNode } from "react";
import { TabPageLayout } from "@/shared/components/layouts";
import { adminFillViewportBelowTopBarClassName } from "@/shared/components/layouts/layoutPageTokens";
import { AccountsReceivableTabs } from "./AccountsReceivableTabs";

export default function AccountsReceivableLayout({ children }: { children: ReactNode }) {
  return (
    <TabPageLayout
      title="Cuentas por cobrar"
      tabs={<AccountsReceivableTabs />}
      className={`min-h-0 ${adminFillViewportBelowTopBarClassName}`}
      contentClassName="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      compact
      data-test-id="accounting-accounts-receivable-layout"
    >
      {children}
    </TabPageLayout>
  );
}
