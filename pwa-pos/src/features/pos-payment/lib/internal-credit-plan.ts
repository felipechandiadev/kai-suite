import type { PosPaymentLine } from "@/features/pos-cart/pos-payment.types";
import type {
  PosInternalCreditPlan,
  PosInternalCreditScheduledLine,
  SaleInstallmentMetadata,
} from "./internal-credit-plan.types";

const CLP_TOLERANCE = 1;

function toYyyyMmDdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseYyyyMmDdLocal(s: string): Date {
  const [y, m, d] = s.split("-").map((x) => Number(x));
  return new Date(y || new Date().getFullYear(), (m || 1) - 1, d || 1);
}

function splitTotalAcrossLines(total: number, count: number): number[] {
  if (count <= 0) return [];
  const n = Math.max(0, Math.round(total));
  const base = Math.floor(n / count);
  const rem = n - base * count;
  return Array.from({ length: count }, (_, i) => base + (i < rem ? 1 : 0));
}

export function computeNetAvailableCredit(
  availableCredit: number,
  existingPayments: PosPaymentLine[],
  excludeLineId?: string | null,
): number {
  const usedInternal = existingPayments
    .filter(
      (p) =>
        p.type === "INTERNAL_CREDIT" &&
        p.id !== excludeLineId &&
        (Number(p.amount) || 0) > 0,
    )
    .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  return Math.max(0, Math.round(Number(availableCredit) || 0) - usedInternal);
}

/** Próximo día de pago del cliente (o +30 días si no hay día configurado). */
export function suggestFirstDueDate(paymentDayOfMonth: number | null | undefined): string {
  const today = new Date();
  const day =
    typeof paymentDayOfMonth === "number" &&
    Number.isFinite(paymentDayOfMonth) &&
    paymentDayOfMonth >= 1 &&
    paymentDayOfMonth <= 31
      ? Math.trunc(paymentDayOfMonth)
      : today.getDate();

  let candidate = new Date(today.getFullYear(), today.getMonth(), day);
  if (candidate <= today) {
    candidate = new Date(today.getFullYear(), today.getMonth() + 1, day);
  }
  return toYyyyMmDdLocal(candidate);
}

export function addMonthsToDueDate(dueDate: string, monthsToAdd: number): string {
  const base = parseYyyyMmDdLocal(dueDate);
  const next = new Date(base.getFullYear(), base.getMonth() + monthsToAdd, base.getDate());
  return toYyyyMmDdLocal(next);
}

export function buildDefaultScheduledLines(
  creditAmount: number,
  count: number,
  firstDueDate: string,
): PosInternalCreditScheduledLine[] {
  const amounts = splitTotalAcrossLines(creditAmount, count);
  return amounts.map((amount, index) => ({
    installmentNumber: index + 1,
    dueDate: addMonthsToDueDate(firstDueDate, index),
    amount,
  }));
}

export function scheduledLinesSum(lines: PosInternalCreditScheduledLine[]): number {
  return lines.reduce((acc, line) => acc + Math.round(Number(line.amount) || 0), 0);
}

export function resolveCreditAmountForMode(
  mode: PosInternalCreditPlan["mode"],
  saleRemaining: number,
  netAvailable: number,
  immediateAmount = 0,
  explicitCreditAmount?: number,
): number {
  const remaining = Math.max(0, Math.round(saleRemaining));
  const available = Math.max(0, Math.round(netAvailable));
  if (mode === "PARTIAL_WITH_SCHEDULE") {
    const immediate = Math.max(0, Math.round(immediateAmount));
    const credit = remaining - immediate;
    return Math.min(Math.max(0, credit), available);
  }
  if (explicitCreditAmount != null && Number.isFinite(explicitCreditAmount)) {
    return Math.min(Math.max(0, Math.round(explicitCreditAmount)), available, remaining);
  }
  return Math.min(remaining, available);
}

export function validateInternalCreditPlan(
  plan: PosInternalCreditPlan,
  netAvailable: number,
  saleRemaining: number,
): string | null {
  const creditAmount = Math.round(Number(plan.creditAmount) || 0);
  const remaining = Math.round(Number(saleRemaining) || 0);
  const available = Math.round(Number(netAvailable) || 0);

  if (creditAmount < 1) {
    return "El monto al crédito debe ser mayor que cero.";
  }
  if (creditAmount > available + CLP_TOLERANCE) {
    return `El monto supera el crédito disponible (${available}).`;
  }

  if (plan.mode === "PARTIAL_WITH_SCHEDULE") {
    const immediate = Math.round(Number(plan.immediateAmount) || 0);
    if (immediate < 1) {
      return "Indique el abono de hoy mayor que cero.";
    }
    if (immediate >= remaining) {
      return "El abono de hoy debe ser menor al saldo de la venta.";
    }
    const expectedCredit = remaining - immediate;
    if (Math.abs(creditAmount - expectedCredit) > CLP_TOLERANCE) {
      return "El saldo al crédito debe ser el total menos el abono de hoy.";
    }
  } else if (creditAmount > remaining + CLP_TOLERANCE) {
    return "El monto al crédito no puede superar el saldo restante de la venta.";
  }

  if (plan.mode === "CREDIT_LUMP") {
    return null;
  }

  const lines = plan.scheduledLines ?? [];
  if (lines.length < 1) {
    return "Agregue al menos una cuota.";
  }

  for (const line of lines) {
    const due = String(line.dueDate ?? "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(due)) {
      return "Cada cuota debe tener una fecha de vencimiento válida.";
    }
    const amount = Math.round(Number(line.amount) || 0);
    if (amount < 1) {
      return "Cada cuota debe tener un monto mayor que cero.";
    }
  }

  const sum = scheduledLinesSum(lines);
  if (Math.abs(sum - creditAmount) > CLP_TOLERANCE) {
    return `Las cuotas suman ${sum}; deben igualar el monto al crédito (${creditAmount}).`;
  }

  return null;
}

export function buildSaleInstallmentMetadata(
  plan: PosInternalCreditPlan,
): SaleInstallmentMetadata | null {
  if (plan.mode === "CREDIT_LUMP" || !plan.scheduledLines?.length) {
    return null;
  }

  const sorted = [...plan.scheduledLines].sort(
    (a, b) => a.installmentNumber - b.installmentNumber,
  );
  const firstDueDate = sorted[0]?.dueDate?.trim();
  if (!firstDueDate) {
    return null;
  }

  return {
    numberOfInstallments: sorted.length,
    firstDueDate,
    paymentSchedule: sorted.map((line) => ({
      installmentNumber: line.installmentNumber,
      dueDate: line.dueDate,
      amount: Math.round(Number(line.amount) || 0),
    })),
    customerCreditPlan: {
      mode: plan.mode,
      creditLineAmount: Math.round(Number(plan.creditAmount) || 0),
      ...(plan.immediateAmount != null && plan.immediateAmount > 0
        ? { immediateAmount: Math.round(plan.immediateAmount) }
        : {}),
    },
  };
}

export function extractInstallmentMetadataFromPayments(
  payments: PosPaymentLine[],
): SaleInstallmentMetadata | null {
  const creditLine = payments.find(
    (p) => p.type === "INTERNAL_CREDIT" && p.internalCreditPlan,
  );
  if (!creditLine?.internalCreditPlan) {
    return null;
  }
  return buildSaleInstallmentMetadata(creditLine.internalCreditPlan);
}

export function formatInternalCreditPlanSubtitle(plan: PosInternalCreditPlan): string {
  if (plan.mode === "CREDIT_LUMP") {
    return "Crédito total";
  }
  const count = plan.scheduledLines.length;
  const first = plan.scheduledLines[0]?.dueDate;
  const firstLabel = first
    ? new Date(`${first}T12:00:00`).toLocaleDateString("es-CL")
    : "";
  if (plan.mode === "PARTIAL_WITH_SCHEDULE" && (plan.immediateAmount ?? 0) > 0) {
    const imm = new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    }).format(plan.immediateAmount ?? 0);
    return `Abono ${imm} + ${count} cuota(s)`;
  }
  return firstLabel
    ? `${count} cuota(s) · desde ${firstLabel}`
    : `${count} cuota(s) programada(s)`;
}
