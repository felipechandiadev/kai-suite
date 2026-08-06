/** Mensaje canónico al expulsar al mesero a la grilla de Mesas. */
export const WAITER_ACCOUNT_UNAVAILABLE_MSG =
  "La cuenta ya fue cerrada o cobrada.";

/**
 * Errores de API / backend que indican que la cuenta ya no se puede operar
 * (cerrada, cobrada, no encontrada). BILLING no aplica aquí.
 */
export function isWaiterAccountUnavailableError(
  message: string | null | undefined,
): boolean {
  const m = (message ?? "").trim().toLowerCase();
  if (!m) return false;
  if (m.includes("closed")) return true;
  if (m.includes("cerrad")) return true; // cerrada / cerrado
  if (m.includes("ya fue cobrad") || m.includes("ya está cobrad")) return true;
  if (m.includes("no acepta ítems") || m.includes("no acepta items")) return true;
  if (m.includes("no se pueden agregar") && m.includes("estado")) return true;
  if (m.includes("cuenta no encontrada") || m.includes("order not found")) {
    return true;
  }
  if (m.includes("not found") && (m.includes("cuenta") || m.includes("order"))) {
    return true;
  }
  return false;
}

export function messageFromUnknownError(e: unknown, fallback: string): string {
  return e instanceof Error && e.message.trim() ? e.message : fallback;
}
