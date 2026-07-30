import { getCompanyDetailsAction } from "@/features/company/actions/company.action";
import { printCashHubMovement } from "@/features/cash-hub-movement/lib/cash-hub-movement-ticket-agent";
import type { CashHubMovementPrintInput } from "@/features/cash-hub-movement/lib/cash-hub-movement-print.types";
import { readPosContextClient } from "@/features/session/lib/pos-context-storage";

export type CashHubMovementPrintParams = {
  direction: CashHubMovementPrintInput["direction"];
  documentNumber: string;
  amount: number;
  cashHubName: string;
  reason?: string | null;
  operatorName?: string | null;
};

/** Encola impresión del comprobante de ingreso/egreso (fire-and-forget). */
export function printCashHubMovementReceipt(params: CashHubMovementPrintParams): void {
  void (async () => {
    const ctx = readPosContextClient();
    const cashSessionId = ctx?.cashSessionId?.trim();
    if (!cashSessionId) return;

    let company = null;
    try {
      company = (await getCompanyDetailsAction()) ?? null;
    } catch {
      company = null;
    }

    printCashHubMovement({
      direction: params.direction,
      documentNumber: params.documentNumber,
      issuedAt: new Date().toISOString(),
      amount: params.amount,
      cashHubName: params.cashHubName,
      cashSessionId,
      reason: params.reason ?? null,
      company,
      branchName: ctx?.branchName ?? null,
      pointOfSaleName: ctx?.pointOfSaleName ?? null,
      operatorName: params.operatorName ?? null,
    });
  })();
}
