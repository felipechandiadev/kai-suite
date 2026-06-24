"use client";

import { useState } from "react";
import { FulfillmentSettingsPanel } from "./ui/FulfillmentSettingsPanel";
import { FulfillmentMethodsPanel } from "./ui/FulfillmentMethodsPanel";
import { EShopOrdersPanel } from "./ui/EShopOrdersPanel";
import type { EShopFulfillmentMethodRow, EShopFulfillmentSettings, EShopOrderListRow } from "@/features/e-shop-fulfillment/types/eshop-fulfillment.types";
import type { BranchListItem } from "@/features/settings-branches/types/branch.types";
import type { StorageListItem } from "@/features/inventory-storages/types/storage.types";
import type { PriceListListItem } from "@/features/sales-price-lists/types/price-list.types";

type Tab = "settings" | "methods" | "orders";

export function FulfillmentPageContent({
  settings,
  methods,
  orders,
  ordersTotal,
  branches,
  storages,
  priceLists,
}: {
  settings: EShopFulfillmentSettings;
  methods: EShopFulfillmentMethodRow[];
  orders: EShopOrderListRow[];
  ordersTotal: number;
  branches: BranchListItem[];
  storages: StorageListItem[];
  priceLists: PriceListListItem[];
}) {
  const [tab, setTab] = useState<Tab>("orders");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-border pb-2">
        {(
          [
            ["orders", "Pedidos web"],
            ["methods", "Métodos de entrega"],
            ["settings", "Configuración"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-md px-3 py-1.5 text-sm ${
              tab === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "settings" ? (
        <FulfillmentSettingsPanel
          initialSettings={settings}
          branches={branches}
          storages={storages}
          priceLists={priceLists}
        />
      ) : null}
      {tab === "methods" ? <FulfillmentMethodsPanel initialMethods={methods} /> : null}
      {tab === "orders" ? <EShopOrdersPanel rows={orders} total={ordersTotal} /> : null}
    </div>
  );
}
