import type { ReactNode } from "react";
import { BasicPageLayout } from "@kai/ui";

export default function LaundryLayout({ children }: { children: ReactNode }) {
  return (
    <BasicPageLayout contentClassName="min-h-0 min-w-0" data-test-id="laundry-layout">
      {children}
    </BasicPageLayout>
  );
}
