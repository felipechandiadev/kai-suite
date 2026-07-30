import type { CashSessionMovementRow } from "@/features/session/types/cash-session-movement.types";
import { canReprintPosSaleReceipt } from "@/features/pos-print/lib/reprint-sale-receipt";
import { printSupplierPaymentTicketVector } from "@/features/supplier-payment/lib/supplier-payment-ticket-agent";
import { printCashHubMovementAwait } from "@/features/cash-hub-movement/lib/cash-hub-movement-ticket-agent";
import { getCompanyDetailsAction } from "@/features/company/actions/company.action";
import { readPosContextClient } from "@/features/session/lib/pos-context-storage";
import { paymentMethodLabelEs } from "@/features/pos-payment-methods/lib/payment-method-label";

/** Tipos con comprobante de caja (no venta/encargo) reimprimibles desde movimientos. */
const CASH_VOUCHER_REPRINT_TYPES = new Set([
  "SUPPLIER_PAYMENT",
  "CASH_SESSION_DEPOSIT",
  "CASH_SESSION_TO_HUB_TRANSFER",
]);

export function canReprintCashMovementVoucher(transactionType: string): boolean {
  return CASH_VOUCHER_REPRINT_TYPES.has(String(transactionType ?? "").trim());
}

/** ¿Mostrar icono de impresora en la grilla de movimientos? */
export function canShowCashMovementReprint(transactionType: string): boolean {
  const t = String(transactionType ?? "").trim();
  if (t === "CASH_CHANGE") return false;
  return canReprintPosSaleReceipt(t) || canReprintCashMovementVoucher(t);
}

function metaRecord(metadata: unknown): Record<string, unknown> {
  return metadata && typeof metadata === "object" && !Array.isArray(metadata)
    ? (metadata as Record<string, unknown>)
    : {};
}

function hubNameFromMovement(row: CashSessionMovementRow): string {
  const meta = metaRecord(row.metadata);
  const fromMeta =
    (typeof meta.cashHubName === "string" && meta.cashHubName.trim()) ||
    (typeof row.counterpartyLabel === "string" && row.counterpartyLabel.trim()) ||
    "";
  return fromMeta || "Centro de efectivo";
}

function supplierNameFromMovement(row: CashSessionMovementRow): string {
  const label =
    (typeof row.counterpartyLabel === "string" && row.counterpartyLabel.trim()) || "";
  return label || "Proveedor";
}

/**
 * Reimprime comprobante de caja (pago proveedor / movimiento centro).
 * Ventas y encargos usan el flujo de preview (`CashMovementReprintPreviewDialog`).
 */
export async function reprintCashMovementVoucher(
  row: CashSessionMovementRow,
): Promise<{ success: true } | { success: false; message: string }> {
  const ctx = readPosContextClient();
  const cashSessionId = ctx?.cashSessionId?.trim() || "";
  if (!cashSessionId) {
    return { success: false, message: "No hay sesión de caja activa." };
  }

  let company = null;
  try {
    company = (await getCompanyDetailsAction()) ?? null;
  } catch {
    company = null;
  }

  const type = String(row.transactionType ?? "").trim();
  const common = {
    documentNumber: row.documentNumber?.trim() || row.id,
    issuedAt: row.createdAt || new Date().toISOString(),
    amount: Number(row.total) || 0,
    cashSessionId,
    company,
    branchName: ctx?.branchName ?? null,
    pointOfSaleName: ctx?.pointOfSaleName ?? null,
    operatorName: row.userFullName?.trim() || row.userUserName?.trim() || null,
    reason: row.reason?.trim() || row.notes?.trim() || null,
  };

  try {
    if (type === "SUPPLIER_PAYMENT") {
      await printSupplierPaymentTicketVector({
        ...common,
        supplierName: supplierNameFromMovement(row),
        paymentMethodLabel: paymentMethodLabelEs(row.paymentMethod, row.paymentMethodLabel),
      });
      return { success: true };
    }

    if (type === "CASH_SESSION_DEPOSIT") {
      await printCashHubMovementAwait({
        ...common,
        direction: "IN",
        cashHubName: hubNameFromMovement(row),
      });
      return { success: true };
    }

    if (type === "CASH_SESSION_TO_HUB_TRANSFER") {
      await printCashHubMovementAwait({
        ...common,
        direction: "OUT",
        cashHubName: hubNameFromMovement(row),
      });
      return { success: true };
    }
  } catch (e) {
    return {
      success: false,
      message: e instanceof Error ? e.message : "No se pudo reimprimir el comprobante.",
    };
  }

  return { success: false, message: "Este movimiento no tiene comprobante reimprimible." };
}
