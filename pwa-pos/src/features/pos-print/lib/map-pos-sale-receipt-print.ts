import type { PosSaleReceiptData } from "@/app/(pos)/pos/payment/ui/PosSaleReceiptDialog";
import type { PosSaleReceiptPrintDto } from "@/features/pos-print/types/pos-sale-receipt-print.types";
import type { SalePrintPlan } from "@/features/sale-print-plan/types";

/** Convierte el DTO del backend al modelo usado por los builders de impresión POS. */
export function mapPosSaleReceiptPrintToReceiptData(
  dto: PosSaleReceiptPrintDto,
  extras?: {
    printPlan?: SalePrintPlan | null;
    ticketRole?: PosSaleReceiptData["ticketRole"];
  },
): PosSaleReceiptData {
  const ticketRole = extras?.ticketRole ?? "sale";
  return {
    folio: dto.folio.trim(),
    transactionId: dto.transactionId,
    printPlan: extras?.printPlan ?? dto.salePrintPlan ?? "TICKET_ONLY",
    ticketRole,
    issuedAtIso: dto.issuedAtIso,
    documentKind: dto.documentKind,
    backorder: dto.backorder,
    company: {
      razonSocial: dto.company.razonSocial,
      nombreFantasia: dto.company.nombreFantasia,
      rut: dto.company.rut,
      businessActivity: dto.company.businessActivity,
      logoUrl: dto.company.logoUrl,
      address: dto.company.address ?? null,
      mail: dto.company.mail ?? null,
      phone: dto.company.phone ?? null,
    },
    pos: {
      pointOfSaleName: dto.pos.pointOfSaleName,
      branchName: dto.pos.branchName,
      priceListLabel: dto.pos.priceListLabel,
    },
    customer: dto.customer
      ? {
          customerId: null,
          name: dto.customer.name?.trim() ?? "",
          document: dto.customer.document?.trim() ?? "",
          phone: dto.customer.phone?.trim() ?? "",
          email: dto.customer.email ?? null,
        }
      : null,
    quotation: dto.quotation
      ? {
          documentNumber: dto.quotation.documentNumber,
          validUntil: dto.quotation.validUntil,
        }
      : null,
    lines: dto.lines.map((l) => ({
      productName: l.productName,
      attributes: l.attributes ?? [],
      quantity: l.quantity,
      unitSymbol: l.unitSymbol,
      unitPriceWithTax: l.unitPriceWithTax,
      lineGross: l.lineGross,
      discountAmount: l.discountAmount,
      discountLabel: l.discountLabel,
    })),
    promotions: dto.promotions.map((p) => ({
      code: p.code,
      name: p.name,
      amount: p.amount,
    })),
    totals: {
      subtotalNet: dto.totals.subtotalNet,
      subtotalGross: dto.totals.subtotalGross,
      taxes: dto.totals.taxes,
      lineDiscounts: dto.totals.lineDiscounts,
      orderDiscount: dto.totals.orderDiscount,
      discountsTotal: dto.totals.discountsTotal,
      total: dto.totals.total,
      paid: dto.totals.paid,
      change: dto.totals.change,
    },
    payments: dto.payments.map((p) => ({
      label: p.label,
      amount: p.amount,
      reference: "",
      detail: p.detail,
    })),
  };
}
