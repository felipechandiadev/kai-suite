import {
  payrollLineCategory,
  type PayrollLineCategory,
} from "./payroll-line-types";

export type PayrollSettlementDraftLine = {
  id: string;
  typeId: string;
  amount: string;
};

export type PayrollSettlementTotals = {
  totalEarnings: number;
  totalDeductions: number;
  netPayment: number;
  earningCount: number;
};

export function parsePayrollAmount(value: string | number | undefined): number {
  if (typeof value === "number") {
    return Math.max(0, Math.round(value));
  }
  return Math.max(0, Math.round(Number(String(value ?? "").replace(/\D/g, "")) || 0));
}

export function calculatePayrollSettlementTotals(
  lines: PayrollSettlementDraftLine[],
): PayrollSettlementTotals {
  let totalEarnings = 0;
  let totalDeductions = 0;
  let earningCount = 0;

  for (const line of lines) {
    const amount = parsePayrollAmount(line.amount);
    if (amount <= 0) continue;
    if (payrollLineCategory(line.typeId) === "DEDUCTION") {
      totalDeductions += amount;
    } else {
      totalEarnings += amount;
      earningCount += 1;
    }
  }

  return {
    totalEarnings,
    totalDeductions,
    netPayment: totalEarnings - totalDeductions,
    earningCount,
  };
}

export function draftLinesToPayload(
  lines: PayrollSettlementDraftLine[],
): Array<{ typeId: string; amount: number; category: PayrollLineCategory }> {
  return lines
    .map((line) => ({
      typeId: line.typeId,
      amount: parsePayrollAmount(line.amount),
      category: payrollLineCategory(line.typeId),
    }))
    .filter((line) => line.amount > 0);
}

export function newDraftLine(
  category: PayrollLineCategory,
  typeId?: string,
): PayrollSettlementDraftLine {
  return {
    id: crypto.randomUUID(),
    typeId: typeId ?? (category === "EARNING" ? "ORDINARY" : "AFP"),
    amount: "",
  };
}
