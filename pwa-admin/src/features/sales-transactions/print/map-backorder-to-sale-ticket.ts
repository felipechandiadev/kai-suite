import {
  POS_SALE_TICKET_PAYLOAD_VERSION,
  type PosSaleTicketPayload,
} from "@kai/print-service-client";
import type { SaleReceiptPrintData } from "./backorder-document-print.types";

export function mapSaleReceiptToPosSaleTicketPayload(
  data: SaleReceiptPrintData,
  options?: { logoBase64?: string | null },
): PosSaleTicketPayload {
  const displayName = data.company.nombreFantasia?.trim() || data.company.razonSocial.trim();
  return {
    version: POS_SALE_TICKET_PAYLOAD_VERSION,
    folio: data.folio.trim(),
    issuedAtIso: data.issuedAtIso,
    documentKind: "backorder",
    backorder: data.backorder,
    company: {
      razonSocial: data.company.razonSocial.trim() || displayName,
      nombreFantasia: data.company.nombreFantasia?.trim() || null,
      rut: data.company.rut?.trim() || null,
      businessActivity: data.company.businessActivity?.trim() || null,
      logoBase64: options?.logoBase64 ?? null,
    },
    customer: data.customer
      ? {
          name: data.customer.name,
          document: data.customer.document,
          phone: null,
          email: null,
        }
      : null,
    quotation: null,
    lines: data.lines.map((l) => ({
      productName: l.productName,
      attributes: l.attributes ?? [],
      quantity: l.quantity,
      unitSymbol: null,
      unitPriceWithTax: l.unitPriceWithTax,
      lineGross: l.lineGross,
      discountAmount: 0,
      discountLabel: null,
    })),
    promotions: data.promotions.map((p) => ({
      code: p.code,
      name: p.name,
      amount: p.amount,
    })),
    totals: {
      subtotalNet: data.totals.subtotalNet,
      taxes: data.totals.taxes,
      lineDiscounts: data.totals.lineDiscounts,
      orderDiscount: data.totals.orderDiscount,
      total: data.totals.total,
      change: data.totals.change,
    },
    payments: data.payments.map((p) => ({
      label: p.label,
      amount: p.amount,
      detail: p.detail,
    })),
  };
}

/** @deprecated Usar `mapSaleReceiptToPosSaleTicketPayload`. */
export const mapBackorderToPosSaleTicketPayload = mapSaleReceiptToPosSaleTicketPayload;
