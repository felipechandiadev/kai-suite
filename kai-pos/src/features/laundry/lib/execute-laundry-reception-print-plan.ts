import type { PosSaleReceiptData } from "@/app/(pos)/pos/payment/ui/PosSaleReceiptDialog";
import {
  printLaundryReceptionFromRecord,
} from "@/features/laundry/lib/laundry-reception-ticket-agent";
import type {
  LaundryCatalogBundle,
  LaundryReception,
} from "@/features/laundry/types/laundry.types";
import {
  executeSalePrintPlan,
  formatSalePrintPlanErrors,
  type ExecuteSalePrintPlanResult,
} from "@/features/pos-print/lib/execute-sale-print-plan";
import type { SalePrintPlan } from "@/features/sale-print-plan/types";

export type ExecuteLaundryReceptionPrintPlanResult = {
  guidePrinted: boolean;
  guideError?: string;
  sale?: ExecuteSalePrintPlanResult;
};

export type LaundryReceptionSalePrintArgs = {
  printPlan: SalePrintPlan;
  receipt: PosSaleReceiptData;
  ticketReceipt: PosSaleReceiptData | null;
};

/**
 * Plan de impresión post-registro lavandería: guía siempre; ticket de cobro opcional.
 * Errores se acumulan; no revierten create/cobro.
 */
export async function executeLaundryReceptionPrintPlan(args: {
  reception: LaundryReception;
  catalog?: LaundryCatalogBundle | null;
  serviceNamesByVariantId?: Record<string, string>;
  garmentTypeNamesById?: Record<string, string>;
  sale?: LaundryReceptionSalePrintArgs | null;
}): Promise<ExecuteLaundryReceptionPrintPlanResult> {
  const result: ExecuteLaundryReceptionPrintPlanResult = {
    guidePrinted: false,
  };

  try {
    await printLaundryReceptionFromRecord(
      args.reception,
      args.catalog ?? null,
      args.serviceNamesByVariantId ?? {},
      args.garmentTypeNamesById ?? {},
    );
    result.guidePrinted = true;
  } catch (e) {
    result.guideError = e instanceof Error ? e.message : "print_failed";
  }

  if (args.sale) {
    result.sale = await executeSalePrintPlan({
      printPlan: args.sale.printPlan,
      receipt: args.sale.receipt,
      ticketReceipt: args.sale.ticketReceipt,
    });
  }

  return result;
}

export function formatLaundryReceptionPrintPlanErrors(
  result: ExecuteLaundryReceptionPrintPlanResult,
): string | null {
  const parts: string[] = [];
  if (result.guideError) {
    parts.push(`No se pudo imprimir la guía de recepción. ${result.guideError}`);
  }
  if (result.sale) {
    const saleErr = formatSalePrintPlanErrors(result.sale);
    if (saleErr) parts.push(saleErr);
  }
  return parts.length ? parts.join(" ") : null;
}
