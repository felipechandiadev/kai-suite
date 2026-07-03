import type { PosCartLine } from "@/app/(pos)/pos/ui/PosCartLineCard";
import type { PosPaymentLine } from "@/features/pos-cart/pos-payment.types";
import type { PosSaleCustomer } from "@/features/customers/types/pos-customer.types";
import type { AppliedSnapshot } from "@/features/promotions/lib/discount-engine.types";
import type { LoadedQuotationMeta } from "@/features/pos-cart/cart-storage";
import { extractInstallmentMetadataFromPayments } from "@/features/pos-payment/lib/internal-credit-plan";

/** Cuerpo enviado a `POST /api/cash-sessions/sales` (CreateSaleDto). */
export type CreateSaleApiBody = {
  userName: string;
  pointOfSaleId: string;
  cashSessionId: string;
  paymentMethod: string;
  lines: Array<{
    productVariantId: string;
    quantity: number;
    unitPrice: number;
    unitId?: string;
    discountAmount?: number;
    taxRate?: number;
    taxAmount?: number;
  }>;
  payments?: Array<{
    paymentMethod: string;
    amount: number;
    companyPaymentMethodId?: string;
    reference?: string;
    paymentGatewayIntentId?: string;
    creditNoteTransactionId?: string;
    backorderTransactionId?: string;
    bankAccountId?: string;
    checkData?: {
      checkNumber: string;
      bankName: string;
      drawerName?: string | null;
      drawerDocument?: string | null;
      issueDate?: string | null;
      dueDate?: string | null;
    };
  }>;
  amountPaid?: number;
  changeAmount?: number;
  customerId?: string;
  fulfillBackorderId?: string;
  fulfillPresaleTicketId?: string;
  fulfillPresaleTicketIds?: string[];
  deferPayment?: boolean;
  saleDocumentKind?: "TICKET" | "BOLETA" | "FACTURA";
  metadata?: Record<string, unknown>;
  promotionSnapshot?: Array<{
    promotionId: string;
    promotionCode: string;
    promotionName: string;
    type: string;
    activation: string;
    authorization: string;
    amountDiscounted: number;
    affectedLineIds: string[];
    isOrderLevel?: boolean;
    accountingTag?: string | null;
  }>;
};

export type CreateSaleClientPayload = Omit<CreateSaleApiBody, "userName">;

function dominantPaymentMethod(lines: PosPaymentLine[]): string {
  const used = lines.filter((p) => (Number(p.amount) || 0) > 0);
  if (used.length === 0) return "CASH";
  const sorted = [...used].sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0));
  return sorted[0].type;
}

export function buildCreateSaleLines(cartLines: PosCartLine[]) {
  return cartLines.map((l) => {
    const qty = Number(l.quantity) || 0;
    const unitNet = Number(l.unitPrice) || 0;
    const unitGross = Number(l.unitPriceWithTax) || 0;
    const taxAmount = Math.round(Math.max(0, unitGross - unitNet) * qty);
    const taxRate = Number(l.unitTaxRate);
    const discountAmount = l.discount?.discountAmount ? Math.round(l.discount.discountAmount) : 0;
    return {
      productVariantId: l.variantId,
      quantity: qty,
      unitPrice: unitNet,
      ...(l.unitId ? { unitId: l.unitId } : {}),
      ...(discountAmount > 0 ? { discountAmount } : {}),
      taxRate: Number.isFinite(taxRate) && taxRate >= 0 ? taxRate : undefined,
      taxAmount: taxAmount > 0 ? taxAmount : undefined,
    };
  });
}

type SalePaymentRow = NonNullable<CreateSaleApiBody["payments"]>[number];

export function buildCreateSalePayments(payments: PosPaymentLine[]): SalePaymentRow[] {
  return payments
    .filter((p) => (Number(p.amount) || 0) > 0)
    .map((p) => {
      const row: SalePaymentRow = {
        paymentMethod: p.type,
        amount: Math.round(Number(p.amount) || 0),
        companyPaymentMethodId: p.companyPaymentMethodId?.trim() || undefined,
        reference: p.reference?.trim() || undefined,
        paymentGatewayIntentId: p.paymentGatewayIntentId?.trim() || undefined,
        creditNoteTransactionId: p.creditNoteTransactionId?.trim() || undefined,
        backorderTransactionId: p.backorderTransactionId?.trim() || undefined,
        bankAccountId: p.bankAccountKey?.trim() || undefined,
      };
      if (p.type === "CHECK" && p.checkData) {
        const cd = p.checkData;
        row.checkData = {
          checkNumber: cd.checkNumber?.trim() ?? "",
          bankName: cd.bankName?.trim() ?? "",
          drawerName: cd.drawerName?.trim() || undefined,
          drawerDocument: cd.drawerDocument?.trim() || undefined,
          issueDate: cd.issueDate?.trim() || undefined,
          dueDate: cd.dueDate?.trim() || undefined,
        };
      }
      return row;
    });
}

function buildPromotionSnapshot(applied: AppliedSnapshot[]): CreateSaleApiBody["promotionSnapshot"] {
  if (!applied.length) return undefined;
  return applied.map((ap) => ({
    promotionId: ap.promotionId,
    promotionCode: ap.promotionCode,
    promotionName: ap.promotionName,
    type: String(ap.type),
    activation: String(ap.activation),
    authorization: String(ap.authorization),
    amountDiscounted: Math.round(Number(ap.amountDiscounted) || 0),
    affectedLineIds: [...ap.affectedLineIds],
    isOrderLevel: ap.isOrderLevel === true,
    accountingTag: ap.accountingTag ?? undefined,
  }));
}

export function buildCreateSaleClientPayload(input: {
  pointOfSaleId: string;
  cashSessionId: string;
  cartLines: PosCartLine[];
  payments: PosPaymentLine[];
  customer: PosSaleCustomer | null;
  appliedPromotions: AppliedSnapshot[];
  appliedTotal: number;
  overpay: number;
  fulfillBackorderId?: string | null;
  fulfillPresaleTicketId?: string | null;
  fulfillPresaleTicketIds?: string[];
  deferPayment?: boolean;
  saleDocumentKind?: CreateSaleApiBody["saleDocumentKind"];
  loadedQuotation?: LoadedQuotationMeta | null;
  loadedPresaleTickets?: { id: string; code: string }[];
}): CreateSaleClientPayload {
  const deferPayment = input.deferPayment === true;
  const paymentLines = deferPayment
    ? []
    : input.payments.filter((p) => (Number(p.amount) || 0) > 0);
  const promotionSnapshot = buildPromotionSnapshot(input.appliedPromotions);
  const quotation = input.loadedQuotation;
  const installmentMetadata = deferPayment
    ? null
    : extractInstallmentMetadataFromPayments(input.payments);

  const metadata: Record<string, unknown> = {};
  if (quotation?.id?.trim()) {
    metadata.quotation = {
      id: quotation.id.trim(),
      documentNumber: quotation.documentNumber?.trim() || null,
      expired: quotation.expired === true,
      validUntil: quotation.validUntil || null,
    };
  }
  if (installmentMetadata) {
    metadata.numberOfInstallments = installmentMetadata.numberOfInstallments;
    metadata.firstDueDate = installmentMetadata.firstDueDate;
    metadata.paymentSchedule = installmentMetadata.paymentSchedule;
    metadata.customerCreditPlan = installmentMetadata.customerCreditPlan;
  }

  const hasMetadata = Object.keys(metadata).length > 0;
  const presaleTicketIds = [
    ...new Set(
      (input.loadedPresaleTickets ?? [])
        .map((t) => t.id?.trim())
        .filter((id): id is string => !!id),
    ),
  ];

  return {
    pointOfSaleId: input.pointOfSaleId.trim(),
    cashSessionId: input.cashSessionId.trim(),
    paymentMethod: deferPayment ? "CREDIT" : dominantPaymentMethod(paymentLines),
    lines: buildCreateSaleLines(input.cartLines),
    payments: deferPayment ? [] : buildCreateSalePayments(input.payments),
    amountPaid: deferPayment ? 0 : Math.round(input.appliedTotal),
    changeAmount: deferPayment ? 0 : Math.round(Math.max(0, input.overpay)),
    customerId: input.customer?.customerId?.trim() || undefined,
    fulfillBackorderId: input.fulfillBackorderId?.trim() || undefined,
    ...(presaleTicketIds.length === 1
      ? { fulfillPresaleTicketId: presaleTicketIds[0] }
      : {}),
    ...(presaleTicketIds.length > 0
      ? { fulfillPresaleTicketIds: presaleTicketIds }
      : {}),
    promotionSnapshot,
    ...(hasMetadata ? { metadata } : {}),
    ...(deferPayment ? { deferPayment: true } : {}),
    ...(input.saleDocumentKind ? { saleDocumentKind: input.saleDocumentKind } : {}),
  };
}
