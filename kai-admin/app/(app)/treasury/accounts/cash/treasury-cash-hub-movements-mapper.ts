import type { TreasuryCashHubMovementApiRow } from "@/features/treasury-cash-hubs/infrastructure/treasury-cash-hub-movements.request";
import { mapApiTxToMovementGridRow } from "../bank/treasury-movements-mapper";

export type TreasuryCashMovementGridRow = {
  id: string;
  fecha: string;
  tipo: string;
  documento: string;
  total: string;
  contraparte: string;
  saldo: string;
};

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

/** Misma lógica que CashHubsService.getHubBalance (solo CONFIRMED). */
function cashHubSignedDelta(tx: TreasuryCashHubMovementApiRow): number {
  const status = String(tx.status ?? "").trim();
  if (status !== "CONFIRMED") return 0;

  const type = String(tx.transactionType ?? "").trim();
  const total = Number(tx.total ?? 0);
  if (!Number.isFinite(total)) return 0;

  switch (type) {
    case "CASH_SESSION_TO_HUB_TRANSFER":
    case "BANK_TO_CASH_TRANSFER":
    case "CAPITAL_CONTRIBUTION":
      return total;
    case "CASH_DEPOSIT":
    case "CASH_SESSION_DEPOSIT":
    case "CASH_SESSION_OPENING":
      return -total;
    default:
      return 0;
  }
}

/**
 * Filas para la grilla del centro de efectivo, con saldo corrido hacia atrás
 * desde el saldo actual del hub (movimientos vienen DESC por fecha).
 */
export function mapCashHubMovementsToGridRows(
  apiRows: TreasuryCashHubMovementApiRow[],
  currentBalance: number,
): TreasuryCashMovementGridRow[] {
  const baseRows = apiRows.map(mapApiTxToMovementGridRow);
  let running = Number.isFinite(currentBalance) ? currentBalance : 0;

  return baseRows.map((row, i) => {
    const saldo = formatMoney(running);
    const delta = cashHubSignedDelta(apiRows[i] ?? {});
    const out: TreasuryCashMovementGridRow = {
      id: row.id,
      fecha: row.fecha,
      tipo: row.tipo,
      documento: row.documento,
      total: row.total,
      contraparte: row.contraparte,
      saldo,
    };
    running -= delta;
    return out;
  });
}
