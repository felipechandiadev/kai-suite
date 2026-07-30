import type { ReactNode } from "react";

/** Rutas de transacciones: listados con pestañas en el route group purchasing-transactions-tabbed; rutas …/new sin pestañas. */
export default function PurchasingTransactionsRootLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col" data-test-id="purchasing-transactions-root">
      {children}
    </div>
  );
}
