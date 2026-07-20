import type { TreasuryBankMovementApiRow } from "@/features/treasury-bank-operations/infrastructure/treasury-bank-movements.request";
import { companyPaymentMethodLabel } from "@/features/companies/types/company-payment-methods.types";
import {
  getTransactionStatusLabel,
  getTransactionTypeLabel,
} from "@/features/transactions/types/transaction-types";

export type TreasuryMovementGridRow = {
  id: string;
  fecha: string;
  tipo: string;
  documento: string;
  total: string;
  estado: string;
  contraparte: string;
  medioPago: string;
  direccion: "IN" | "OUT";
  saldo: string;
};

const BANK_IN_TYPES = new Set([
  "CAPITAL_CONTRIBUTION",
  "CASH_DEPOSIT",
  "PAYMENT_IN",
]);

const BANK_OUT_TYPES = new Set([
  "BANK_TO_CASH_TRANSFER",
  "SUPPLIER_PAYMENT",
  "BANK_WITHDRAWAL_TO_SHAREHOLDER",
  "PAYROLL_PAYMENT",
  "EXPENSE_PAYMENT",
  "OPERATING_EXPENSE",
  "PAYMENT_EXECUTION",
]);

export function resolveTransactionDirection(tx: TreasuryBankMovementApiRow): "IN" | "OUT" {
  const type = String(tx.transactionType ?? "").trim();
  const meta = (tx.metadata ?? {}) as Record<string, unknown>;
  if (meta.capitalContribution) return "IN";
  if (meta.bankToCashTransfer) return "OUT";
  if (BANK_IN_TYPES.has(type)) return "IN";
  if (BANK_OUT_TYPES.has(type)) return "OUT";
  return Number(tx.total ?? 0) >= 0 ? "IN" : "OUT";
}

function resolveCounterparty(tx: TreasuryBankMovementApiRow): string {
  const c = tx.customer as Record<string, unknown> | undefined;
  const cp = c?.person as Record<string, unknown> | undefined;
  if (cp) {
    const bn = String(cp.businessName ?? "").trim();
    if (bn) return bn;
    const n = [cp.firstName, cp.lastName].filter(Boolean).join(" ").trim();
    if (n) return n;
  }
  const s = tx.supplier as Record<string, unknown> | undefined;
  const sp = (s?.person as Record<string, unknown> | undefined) ?? undefined;
  if (sp) {
    const bn = String(sp.businessName ?? "").trim();
    if (bn) return bn;
    const n = [sp.firstName, sp.lastName].filter(Boolean).join(" ").trim();
    if (n) return n;
  }
  const sh = tx.shareholder as Record<string, unknown> | undefined;
  const shp = sh?.person as Record<string, unknown> | undefined;
  if (shp) {
    const n = [shp.firstName, shp.lastName].filter(Boolean).join(" ").trim();
    if (n) return n;
  }
  return "—";
}

function resolvePaymentMethod(tx: TreasuryBankMovementApiRow): string {
  const method = String(tx.paymentMethod ?? "").trim();
  if (!method) return "—";
  return companyPaymentMethodLabel(method);
}

function formatMoney(n: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);
}

export function mapApiTxToMovementGridRow(tx: TreasuryBankMovementApiRow): TreasuryMovementGridRow {
  const id = String(tx.id ?? "");
  const created = tx.createdAt != null ? new Date(String(tx.createdAt)) : null;
  const fecha =
    created && !Number.isNaN(created.getTime())
      ? new Intl.DateTimeFormat("es-CL", { dateStyle: "short", timeStyle: "short" }).format(created)
      : "—";
  const tipo = getTransactionTypeLabel(
    tx.transactionType != null ? String(tx.transactionType) : null,
  );
  const documento = String(tx.documentNumber ?? tx.documentFolio ?? "—");
  const totalNum = Number(tx.total ?? 0);
  const total = formatMoney(totalNum);
  const estado = getTransactionStatusLabel(
    tx.status != null ? String(tx.status) : null,
  );
  const direccion = resolveTransactionDirection(tx);
  return {
    id,
    fecha,
    tipo,
    documento,
    total,
    estado,
    contraparte: resolveCounterparty(tx),
    medioPago: resolvePaymentMethod(tx),
    direccion,
    saldo: "—", // se rellena después con el saldo corrido
  };
}

/**
 * Dado el listado de movimientos (orden DESC por fecha) y el saldo libro actual,
 * calcula el saldo corrido hacia atrás (como TreasuryCashMovementsGrid).
 */
export function applyRunningSaldo(
  rows: TreasuryMovementGridRow[],
  apiRows: TreasuryBankMovementApiRow[],
  currentBookBalance: number,
): TreasuryMovementGridRow[] {
  let running = Number.isFinite(currentBookBalance) ? currentBookBalance : 0;
  return rows.map((row, i) => {
    const saldo = formatMoney(running);
    const totalNum = Number(apiRows[i]?.total ?? 0);
    const delta = row.direccion === "IN" ? totalNum : -totalNum;
    running -= delta;
    return { ...row, saldo };
  });
}
