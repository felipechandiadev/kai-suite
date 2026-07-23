"use server";

import { revalidatePath } from "next/cache";
import { RemunerationRequest } from "../infrastructure/remuneration.request";
import type { RemunerationGridRow } from "../types/remuneration.types";
import type { PayrollSettlementPaymentPayload } from "../types/payroll-settlement-payment.types";
import {
  isPayrollLineTypeId,
  payrollLineCategory,
} from "../lib/payroll-line-types";

import { HCM_REMUNERATIONS } from "@/navigation/hcm-routes";

const REMUNERATIONS_PATH = HCM_REMUNERATIONS;

function normalizeSettlementPaymentPayload(
  input?: PayrollSettlementPaymentPayload,
): PayrollSettlementPaymentPayload {
  if (!input?.mode) {
    return { mode: "PENDING", paidLines: [], scheduledLines: [] };
  }
  if (input.mode === "PENDING") {
    return { mode: "PENDING", paidLines: [], scheduledLines: [] };
  }
  return {
    mode: input.mode,
    partialPaidAmount: input.partialPaidAmount,
    paidLines: input.paidLines ?? [],
    scheduledLines: input.scheduledLines ?? [],
  };
}

export type CreateRemunerationFormInput = {
  employeeId: string;
  date: string;
  resultCenterId?: string | null;
  lines: Array<{ typeId: string; amount: number }>;
  settlementPayment?: PayrollSettlementPaymentPayload;
};

export type CreateRemunerationResult =
  | { success: true; id: string; documentNumber?: string | null }
  | { success: false; error: string };

function parseAmount(value: string | number | undefined): number {
  if (typeof value === "number") {
    return Math.max(0, Math.round(value));
  }
  return Math.max(0, Math.round(Number(String(value ?? "").replace(/\D/g, "")) || 0));
}

export async function listRemunerationsForGridAction(opts: {
  employeeId?: string;
  status?: string;
} = {}): Promise<RemunerationGridRow[]> {
  return RemunerationRequest.list(opts);
}

export async function getRemunerationDetailAction(
  id: string,
): Promise<
  { success: true; data: RemunerationGridRow } | { success: false; error: string }
> {
  const trimmed = id?.trim() ?? "";
  if (!trimmed) {
    return { success: false, error: "Liquidación no válida." };
  }
  try {
    const data = await RemunerationRequest.getById(trimmed);
    if (!data) {
      return { success: false, error: "Liquidación no encontrada." };
    }
    return { success: true, data };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Error al cargar la liquidación",
    };
  }
}

export async function createRemunerationAction(
  input: CreateRemunerationFormInput,
): Promise<CreateRemunerationResult> {
  const employeeId = input.employeeId?.trim() ?? "";
  if (!employeeId) {
    return { success: false, error: "Seleccione un empleado." };
  }
  const date = input.date?.trim() ?? "";
  if (!date) {
    return { success: false, error: "La fecha de liquidación es obligatoria." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { success: false, error: "La fecha debe tener formato AAAA-MM-DD." };
  }

  const rawLines = Array.isArray(input.lines) ? input.lines : [];
  if (rawLines.length === 0) {
    return { success: false, error: "Agregue al menos una línea de haber o descuento." };
  }

  const lines: Array<{ typeId: string; amount: number }> = [];
  let totalEarnings = 0;
  let totalDeductions = 0;

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const typeId = String(line?.typeId ?? "").trim();
    const amount = parseAmount(line?.amount);
    if (!typeId) {
      return { success: false, error: `La línea ${i + 1} debe tener un tipo.` };
    }
    if (!isPayrollLineTypeId(typeId)) {
      return { success: false, error: `Tipo de línea no válido: ${typeId}` };
    }
    if (amount <= 0) {
      return { success: false, error: `La línea ${i + 1} debe tener monto mayor a cero.` };
    }
    if (payrollLineCategory(typeId) === "DEDUCTION") {
      totalDeductions += amount;
    } else {
      totalEarnings += amount;
    }
    lines.push({ typeId, amount });
  }

  if (totalEarnings <= 0) {
    return { success: false, error: "La liquidación debe incluir al menos un haber." };
  }

  const net = totalEarnings - totalDeductions;
  if (net < 0) {
    return {
      success: false,
      error: "El líquido a pagar no puede ser negativo (descuentos superan haberes).",
    };
  }

  const settlementPayment = normalizeSettlementPaymentPayload(input.settlementPayment);
  if (settlementPayment.mode === "PENDING") {
    const paid = settlementPayment.paidLines.length;
    const sched = settlementPayment.scheduledLines.length;
    if (paid > 0 || sched > 0) {
      return {
        success: false,
        error: "Pago pendiente: no debe incluir líneas de pago.",
      };
    }
  }

  const res = await RemunerationRequest.create({
    employeeId,
    date,
    resultCenterId: input.resultCenterId?.trim() || null,
    lines,
    settlementPayment,
    autoCreateOperationalExpenses: true,
    autoSuggestStatutory: true,
  });
  if (res.success) {
    revalidatePath(REMUNERATIONS_PATH, "page");
  }
  return res;
}

export async function previewPayrollSettlementAction(input: {
  employeeId: string;
  date?: string;
  lines?: Array<{ typeId: string; amount: number }>;
}) {
  try {
    const data = await RemunerationRequest.previewSettlement({
      employeeId: input.employeeId,
      date: input.date,
      lines: input.lines,
      includeContractAllowances: true,
    });
    return { success: true as const, data };
  } catch (e) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Error al previsualizar liquidación",
    };
  }
}

export async function listPayrollSuggestionsFromJornadaAction(opts: {
  employeeId?: string;
} = {}) {
  try {
    const data = await RemunerationRequest.listSuggestions({
      employeeId: opts.employeeId,
      status: "PENDING",
    });
    return { success: true as const, data };
  } catch (e) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Error al cargar sugerencias",
    };
  }
}
