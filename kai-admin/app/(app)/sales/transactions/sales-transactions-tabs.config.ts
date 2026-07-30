export const SALES_TRANSACTIONS_BASE = "/sales/transactions";

export const SALES_TRANSACTIONS_TAB_ITEMS = [
  { url: `${SALES_TRANSACTIONS_BASE}/sales`, label: "Ventas" },
  { url: `${SALES_TRANSACTIONS_BASE}/backorders`, label: "Encargos" },
  { url: `${SALES_TRANSACTIONS_BASE}/customer-returns`, label: "Devoluciones cliente" },
  { url: `${SALES_TRANSACTIONS_BASE}/quotations`, label: "Cotizaciones" },
  { url: `${SALES_TRANSACTIONS_BASE}/payments`, label: "Pagos recibidos" },
] as const;

export function salesTransactionsActiveTabUrl(pathname: string): string {
  const match = [...SALES_TRANSACTIONS_TAB_ITEMS]
    .filter((tab) => pathname === tab.url || pathname.startsWith(`${tab.url}/`))
    .sort((a, b) => b.url.length - a.url.length)[0];
  return match?.url ?? `${SALES_TRANSACTIONS_BASE}/sales`;
}
