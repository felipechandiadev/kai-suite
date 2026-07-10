import type { ReactNode } from "react";
import { BasicPageLayout } from "@kai/ui";

export default function ReceptionNewLayout({ children }: { children: ReactNode }) {
  return (
    <BasicPageLayout contentClassName="min-h-0 min-w-0 p-0" data-test-id="receptions-new-layout">
      {children}
    </BasicPageLayout>
  );
}
