"use client";

import { usePathname } from "next/navigation";
import Tabs from "@/shared/components/Tabs";

const TAB_TABLE = "/accounting/accounts-receivable";
const TAB_CALENDAR = "/accounting/accounts-receivable/calendar";

const items = [
  { url: TAB_TABLE, label: "Tabla" },
  { url: TAB_CALENDAR, label: "Calendario" },
];

export function AccountsReceivableTabs() {
  const pathname = usePathname();
  const activeTab = pathname.startsWith(TAB_CALENDAR) ? TAB_CALENDAR : TAB_TABLE;

  return (
    <div className="w-fit max-w-full shrink-0 border-b border-border">
      <Tabs items={items} activeTab={activeTab} />
    </div>
  );
}
