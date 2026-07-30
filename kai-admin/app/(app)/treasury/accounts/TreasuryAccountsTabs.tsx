"use client";

import { Tabs } from "@kai/ui";

export function TreasuryAccountsTabs() {
  const items = [
    { label: "Cuentas bancarias", url: "/treasury/accounts/bank" },
    { label: "Centros de efectivo", url: "/treasury/accounts/cash" },
  ];
  return <Tabs items={items} />;
}
