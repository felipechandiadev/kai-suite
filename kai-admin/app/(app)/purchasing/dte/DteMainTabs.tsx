"use client";

import { Tabs } from "@kai/ui";

export function DteMainTabs() {
  return (
    <Tabs
      items={[
        { label: "Facturas", url: "/purchasing/dte/invoices" },
        { label: "Boletas", url: "/purchasing/dte/receipts" },
        { label: "Boletas de honorarios", url: "/purchasing/dte/honorarium-receipts" },
        { label: "Guías de despacho", url: "/purchasing/dte/guides" },
        { label: "Notas de crédito", url: "/purchasing/dte/credit-notes" },
      ]}
    />
  );
}
