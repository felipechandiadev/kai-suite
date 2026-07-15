/**
 * Tipos agente (`type` del protocolo print) que pueden abrir gaveta en 80 mm
 * si la línea Tickets tiene «Apertura de gaveta» activa en Kai Printers.
 *
 * Debe mantenerse alineado con `cash_drawer_policy.rs` (desktop) y `CashDrawerPolicy.kt` (Android).
 */
export const CASH_DRAWER_ELIGIBLE_AGENT_TYPES = new Set([
  "pos-sale-ticket",
  "fiscal-boleta-preview",
  "pos-cash-session-opening-ticket",
  "pos-cash-count-sheet-ticket",
  "pos-cash-hub-movement-ticket",
  "pos-supplier-payment-ticket",
  "pos-payment-in-ticket",
  "test_print",
  "test_escpos_qa",
  "test_escpos_qa_nocut",
]);

/** Pulso de gaveta en prueba dedicada (ignora switch de mapeo en desktop). */
export const CASH_DRAWER_TEST_AGENT_TYPE = "test_drawer";

export function agentPrintTypeMayOpenCashDrawer(agentType: string | null | undefined): boolean {
  const t = (agentType ?? "").trim();
  if (!t) return false;
  if (t === CASH_DRAWER_TEST_AGENT_TYPE) return true;
  return CASH_DRAWER_ELIGIBLE_AGENT_TYPES.has(t);
}

/** Ancho mínimo de ticket (columnas) para gaveta: 48 = 80 mm, 32 = 58 mm. */
export const CASH_DRAWER_MIN_WIDTH_CHARS = 48;

export function ticketWidthCharsMayOpenCashDrawer(widthChars: number): boolean {
  return widthChars >= CASH_DRAWER_MIN_WIDTH_CHARS;
}

export function shouldOpenCashDrawerForTicketJob(
  agentType: string | null | undefined,
  widthChars: number,
  drawerEnabledInMapping: boolean,
): boolean {
  if (!ticketWidthCharsMayOpenCashDrawer(widthChars)) return false;
  const t = (agentType ?? "").trim();
  if (t === CASH_DRAWER_TEST_AGENT_TYPE) return true;
  if (!drawerEnabledInMapping) return false;
  return agentPrintTypeMayOpenCashDrawer(t);
}
