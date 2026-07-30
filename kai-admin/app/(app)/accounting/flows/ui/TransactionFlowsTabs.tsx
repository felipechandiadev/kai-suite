"use client";

import { usePathname } from "next/navigation";
import { Tabs } from "@kai/ui";

const TAB_SALES = "/accounting/flows/sales";
const TAB_PURCHASE = "/accounting/flows/purchase";

const items = [
  { url: TAB_SALES, label: "Sales" },
  { url: TAB_PURCHASE, label: "Compra" },
];

export function TransactionFlowsTabs() {
  const pathname = usePathname();
  const activeTab = pathname.startsWith(TAB_PURCHASE)
    ? TAB_PURCHASE
    : TAB_SALES;
  return <Tabs items={items} activeTab={activeTab} />;
}

