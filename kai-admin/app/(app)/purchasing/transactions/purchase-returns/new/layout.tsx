import type { ReactNode } from "react";
import { BasicPageLayout } from "@kai/ui";
import { adminFillViewportBelowTopBarClassName } from "@kai/ui";

export default function PurchaseReturnNewLayout({ children }: { children: ReactNode }) {
  return (
    <BasicPageLayout
      className={adminFillViewportBelowTopBarClassName}
      contentClassName={`flex min-h-0 min-w-0 flex-col p-0 ${adminFillViewportBelowTopBarClassName}`}
      data-test-id="purchase-returns-new-layout"
    >
      {children}
    </BasicPageLayout>
  );
}
