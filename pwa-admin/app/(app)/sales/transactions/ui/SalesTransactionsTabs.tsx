"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { Tabs } from "@kai/ui";
import {
  SALES_TRANSACTIONS_TAB_ITEMS,
  salesTransactionsActiveTabUrl,
} from "../sales-transactions-tabs.config";

export function SalesTransactionsTabs() {
  const pathname = usePathname();
  const activeTab = useMemo(
    () => salesTransactionsActiveTabUrl(pathname),
    [pathname],
  );
  return <Tabs items={[...SALES_TRANSACTIONS_TAB_ITEMS]} activeTab={activeTab} />;
}
