import type { ReceptionPlannedPaymentLinePayload } from "@/features/receptions/types/reception-document-payment.types";
import type { ReceptionSupplierDocumentPaymentPayload } from "@/features/receptions/types/reception-document-payment.types";
import type { InvoicePlannedPaymentLineState } from "@/shared/components/PlannedPaymentLines/InvoicePlannedPaymentLines";
import type { InvoicePlannedPaymentMethodUI } from "@/shared/components/PlannedPaymentLines/InvoicePlannedPaymentLines";
import type { PlannedPaymentMode } from "@/shared/components/PlannedPaymentLines/planned-payment-mode.types";
import type { CompanyBankAccountItem } from "@/features/settings-branches/infrastructure/company.request";
import type { Option } from "@kai/ui";
import {
  bankAccountOptionKey,
  parseClpAmountInput,
  splitTotalAcrossLines,
} from "@/features/purchasing-dte/lib/planned-payment-helpers";

export type PayeeBankAccount = {
  accountKey?: string;
  bankName: string;
  accountType: string;
  accountNumber: string;
  accountHolderName?: string;
  isPrimary?: boolean;
  notes?: string | null;
};

export type PlannedPaymentLinePayload = ReceptionPlannedPaymentLinePayload;

export type PlannedPaymentPayload = ReceptionSupplierDocumentPaymentPayload;

export function defaultPayeePaymentMethod(
  companyHasBanks: boolean,
  payeeHasBanks: boolean,
): InvoicePlannedPaymentMethodUI {
  return companyHasBanks && payeeHasBanks ? "TRANSFER" : "CASH";
}

/** @deprecated Use `defaultPayeePaymentMethod`. */
export const defaultSupplierPaymentMethod = defaultPayeePaymentMethod;

export function newScheduledPaymentLine(args: {
  dueDate: string;
  amountStr: string;
}): InvoicePlannedPaymentLineState {
  return {
    id: crypto.randomUUID(),
    dueDate: args.dueDate,
    amountStr: args.amountStr,
    companyBankAccountKey: null,
    supplierBankAccountKey: null,
    chequeNumber: "",
  };
}

export function newImmediatePaymentLine(args: {
  dueDate: string;
  amountStr: string;
  companyHasBanks: boolean;
  payeeHasBanks: boolean;
  companyBankAccounts: CompanyBankAccountItem[];
  payeeBankAccounts: PayeeBankAccount[];
  cashHubOptions: Option[];
}): InvoicePlannedPaymentLineState {
  const dm = defaultPayeePaymentMethod(args.companyHasBanks, args.payeeHasBanks);
  const firstHub = args.cashHubOptions[0];
  return {
    id: crypto.randomUUID(),
    dueDate: args.dueDate,
    amountStr: args.amountStr,
    paymentMethod: dm,
    companyBankAccountKey:
      args.companyBankAccounts[0] != null
        ? bankAccountOptionKey(args.companyBankAccounts[0], 0)
        : null,
    supplierBankAccountKey:
      args.payeeBankAccounts[0] != null
        ? bankAccountOptionKey(args.payeeBankAccounts[0], 0)
        : null,
    chequeNumber: "",
    cashHubId: dm === "CASH" && firstHub ? String(firstHub.id) : null,
  };
}

export function immediateLineToPayload(
  l: InvoicePlannedPaymentLineState,
): PlannedPaymentLinePayload {
  const pm = l.paymentMethod ?? "CASH";
  return {
    dueDate: l.dueDate,
    amount: parseClpAmountInput(l.amountStr),
    paymentMethod: pm,
    companyBankAccountKey:
      pm === "TRANSFER" || pm === "CHECK" ? l.companyBankAccountKey : null,
    supplierBankAccountKey: pm === "TRANSFER" ? l.supplierBankAccountKey : null,
    chequeNumber: pm === "CHECK" ? String(l.chequeNumber).trim() || null : null,
    cashHubId: pm === "CASH" ? (l.cashHubId?.trim() ? l.cashHubId.trim() : null) : null,
  };
}

export function scheduledLineToPayload(
  l: InvoicePlannedPaymentLineState,
): PlannedPaymentLinePayload {
  return {
    dueDate: l.dueDate,
    amount: parseClpAmountInput(l.amountStr),
  };
}

export function applyEqualPaymentAmounts(
  lines: InvoicePlannedPaymentLineState[],
  amountTotal: number,
): InvoicePlannedPaymentLineState[] {
  if (lines.length === 0) {
    return lines;
  }
  const parts = splitTotalAcrossLines(amountTotal, lines.length);
  return lines.map((l, i) => ({ ...l, amountStr: String(parts[i] ?? 0) }));
}

export function buildPlannedPaymentPayload(args: {
  mode: PlannedPaymentMode;
  partialAmount: number;
  paidLines: InvoicePlannedPaymentLineState[];
  scheduledLines: InvoicePlannedPaymentLineState[];
}): PlannedPaymentPayload {
  const { mode, partialAmount, paidLines, scheduledLines } = args;
  if (mode === "PENDING") {
    return { mode, paidLines: [], scheduledLines: [] };
  }
  if (mode === "PENDING_SCHEDULED") {
    return {
      mode,
      paidLines: [],
      scheduledLines: scheduledLines.map(scheduledLineToPayload),
    };
  }
  if (mode === "COMPLETED") {
    return {
      mode,
      paidLines: paidLines.map(immediateLineToPayload),
      scheduledLines: [],
    };
  }
  return {
    mode: "PARTIAL",
    partialPaidAmount: partialAmount,
    paidLines: [],
    scheduledLines: scheduledLines.map(scheduledLineToPayload),
  };
}

/** Alias para documentos de proveedor / recepciones. */
export const buildSupplierDocumentPaymentPayload = buildPlannedPaymentPayload;

export type ValidatePlannedPaymentPlanArgs = {
  mode: PlannedPaymentMode;
  total: number;
  partialAmount: number;
  partialAmountStr?: string;
  paidLines: InvoicePlannedPaymentLineState[];
  scheduledLines: InvoicePlannedPaymentLineState[];
  scheduleAmountError: string | null;
  hasCashHubOptions: boolean;
  payeeSelected: boolean;
  /** Si true, valida líquido cero (nómina). Si false, omite validación sin beneficiario/total (compras). */
  strictZeroTotal?: boolean;
  totalLabel?: string;
};

function sumLines(lines: InvoicePlannedPaymentLineState[]): number {
  return lines.reduce((s, l) => s + parseClpAmountInput(l.amountStr), 0);
}

export function validatePlannedPaymentPlanClient(
  args: ValidatePlannedPaymentPlanArgs,
): string | null {
  const {
    mode,
    total: rawTotal,
    partialAmount,
    paidLines,
    scheduledLines,
    scheduleAmountError,
    hasCashHubOptions,
    payeeSelected,
    strictZeroTotal = false,
    totalLabel = "total",
  } = args;

  const total = Math.max(0, Math.round(rawTotal || 0));
  const eps = 1;

  if (strictZeroTotal && total <= 0) {
    if (mode !== "PENDING") {
      return `No se puede programar pago cuando el ${totalLabel} es cero.`;
    }
    if (paidLines.length || scheduledLines.length) {
      return "Pago pendiente: no debe incluir líneas de pago.";
    }
    return null;
  }

  if (!payeeSelected || total <= 0) {
    return null;
  }

  const checkLines = (lines: InvoicePlannedPaymentLineState[], label: string): string | null => {
    for (const l of lines) {
      if (parseClpAmountInput(l.amountStr) <= 0 || !l.dueDate.trim()) {
        return `${label}: monto y fecha requeridos.`;
      }
      if (l.paymentMethod === "CASH") {
        if (!hasCashHubOptions) {
          return `No hay centros de efectivo configurados (${label}).`;
        }
        if (!l.cashHubId?.trim()) {
          return `Seleccione centro de efectivo (${label}).`;
        }
      }
      if (l.paymentMethod === "TRANSFER") {
        if (!l.companyBankAccountKey || !l.supplierBankAccountKey) {
          return `Complete cuentas para transferencia (${label}).`;
        }
      }
      if (l.paymentMethod === "CHECK") {
        if (!l.companyBankAccountKey || !String(l.chequeNumber).trim()) {
          return `Complete cuenta empresa y número de cheque (${label}).`;
        }
      }
    }
    return null;
  };

  if (mode === "PENDING") {
    if (strictZeroTotal && (paidLines.length || scheduledLines.length)) {
      return "Pago pendiente: no debe incluir líneas de pago.";
    }
    return null;
  }

  if (mode === "PENDING_SCHEDULED") {
    if (paidLines.length) {
      return "No debe incluir abonos ejecutados.";
    }
    if (scheduledLines.length === 0) {
      return "Agregue al menos una cuota programada.";
    }
    if (Math.abs(sumLines(scheduledLines) - total) > eps) {
      return `Las cuotas deben sumar el ${totalLabel}.`;
    }
    return scheduleAmountError;
  }

  if (mode === "COMPLETED") {
    if (!paidLines.length) {
      return "Defina la línea de pago.";
    }
    if (scheduledLines.length) {
      return "No debe incluir cuotas pendientes.";
    }
    if (Math.abs(sumLines(paidLines) - total) > eps) {
      return `El pago debe igualar el ${totalLabel}.`;
    }
    return checkLines(paidLines, "pago único");
  }

  if (mode === "PARTIAL") {
    const part =
      partialAmount > 0
        ? partialAmount
        : parseClpAmountInput(args.partialAmountStr ?? "0");
    if (part <= 0 || part >= total) {
      return `Indique un monto parcial mayor que 0 y menor que el ${totalLabel}.`;
    }
    const rest = total - part;
    if (rest > 0 && scheduledLines.length === 0) {
      return "Agregue al menos una cuota para el saldo restante.";
    }
    if (rest > 0 && Math.abs(sumLines(scheduledLines) - rest) > eps) {
      return scheduleAmountError ?? `Las cuotas deben sumar el saldo restante.`;
    }
    if (rest > 0 && scheduleAmountError) {
      return scheduleAmountError;
    }
    return null;
  }

  return null;
}

/** @deprecated Use `validatePlannedPaymentPlanClient`. */
export function validateSupplierDocumentPaymentClient(args: {
  mode: PlannedPaymentMode;
  documentTotal: number;
  partialAmount: number;
  paidLines: InvoicePlannedPaymentLineState[];
  scheduledLines: InvoicePlannedPaymentLineState[];
  scheduleAmountError: string | null;
  hasCashHubOptions: boolean;
  supplierSelected: boolean;
}): string | null {
  return validatePlannedPaymentPlanClient({
    mode: args.mode,
    total: args.documentTotal,
    partialAmount: args.partialAmount,
    paidLines: args.paidLines,
    scheduledLines: args.scheduledLines,
    scheduleAmountError: args.scheduleAmountError,
    hasCashHubOptions: args.hasCashHubOptions,
    payeeSelected: args.supplierSelected,
    totalLabel: "total del documento",
  });
}

export function payloadLineToUiState(
  p: PlannedPaymentLinePayload,
  kind: "immediate" | "scheduled",
): InvoicePlannedPaymentLineState {
  if (kind === "scheduled") {
    return {
      id: crypto.randomUUID(),
      dueDate: p.dueDate,
      amountStr: String(Math.round(p.amount)),
      companyBankAccountKey: null,
      supplierBankAccountKey: null,
      chequeNumber: "",
    };
  }
  return {
    id: crypto.randomUUID(),
    dueDate: p.dueDate,
    amountStr: String(Math.round(p.amount)),
    paymentMethod: p.paymentMethod ?? "CASH",
    companyBankAccountKey: p.companyBankAccountKey ?? null,
    supplierBankAccountKey: p.supplierBankAccountKey ?? null,
    chequeNumber: p.chequeNumber ?? "",
    cashHubId: p.cashHubId ?? null,
    cashSessionId: p.cashSessionId ?? null,
  };
}

export function hydratePlannedPaymentFromPayload(
  draft: PlannedPaymentPayload,
): {
  paymentMode: PlannedPaymentMode;
  partialAmountStr: string;
  paidLines: InvoicePlannedPaymentLineState[];
  scheduledLines: InvoicePlannedPaymentLineState[];
} {
  return {
    paymentMode: draft.mode,
    partialAmountStr:
      draft.mode === "PARTIAL"
        ? String(Math.max(0, Math.round(draft.partialPaidAmount ?? 0)))
        : "0",
    paidLines: draft.paidLines.map((p) => payloadLineToUiState(p, "immediate")),
    scheduledLines: draft.scheduledLines.map((p) => payloadLineToUiState(p, "scheduled")),
  };
}
