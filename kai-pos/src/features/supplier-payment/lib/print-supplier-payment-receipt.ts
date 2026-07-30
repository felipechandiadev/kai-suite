import { getCompanyDetailsAction } from "@/features/company/actions/company.action";
import { printSupplierPayment } from "@/features/supplier-payment/lib/supplier-payment-ticket-agent";
import { readPosContextClient } from "@/features/session/lib/pos-context-storage";

export type SessionCashSupplierPaymentPrintRow = {
  documentNumber: string;
  amount: number;
  paymentMethod?: string;
  cashSessionId?: string;
  notes?: string | null;
};

export type PrintSupplierPaymentReceiptsParams = {
  payments: SessionCashSupplierPaymentPrintRow[];
  supplierName: string;
  supplierDocument?: string | null;
  receptionDocumentNumber?: string | null;
  supplierDocumentRef?: string | null;
  operatorName?: string | null;
};

/** Encola un ticket por cada pago en efectivo desde sesión (fire-and-forget). */
export function printSupplierPaymentReceipts(params: PrintSupplierPaymentReceiptsParams): void {
  void (async () => {
    const ctx = readPosContextClient();
    const fallbackSessionId = ctx?.cashSessionId?.trim() || "";
    if (!params.payments.length) return;

    let company = null;
    try {
      company = (await getCompanyDetailsAction()) ?? null;
    } catch {
      company = null;
    }

    const issuedAt = new Date().toISOString();
    for (const pay of params.payments) {
      const cashSessionId = pay.cashSessionId?.trim() || fallbackSessionId;
      if (!cashSessionId || !pay.documentNumber?.trim()) continue;
      printSupplierPayment({
        documentNumber: pay.documentNumber.trim(),
        issuedAt,
        amount: Number(pay.amount) || 0,
        supplierName: params.supplierName.trim() || "Proveedor",
        supplierDocument: params.supplierDocument ?? null,
        receptionDocumentNumber: params.receptionDocumentNumber ?? null,
        supplierDocumentRef: params.supplierDocumentRef ?? null,
        cashSessionId,
        paymentMethodLabel: "Efectivo",
        reason: pay.notes ?? null,
        company,
        branchName: ctx?.branchName ?? null,
        pointOfSaleName: ctx?.pointOfSaleName ?? null,
        operatorName: params.operatorName ?? null,
      });
    }
  })();
}
