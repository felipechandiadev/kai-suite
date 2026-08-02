import type { PosCartLine } from "@/app/(pos)/pos/ui/PosCartLineCard";
import type { PosPaymentLine } from "@/features/pos-cart/pos-payment.types";
import type { PosSaleCustomer } from "@/features/customers/types/pos-customer.types";
import type { AppliedSnapshot } from "@/features/promotions/lib/discount-engine.types";
import type { LoadedQuotationMeta } from "@/features/pos-cart/cart-storage";
import { assertCartSinglePriceList } from "@/features/pos-cart/lib/pos-cart-price-list";
import { extractInstallmentMetadataFromPayments } from "@/features/pos-payment/lib/internal-credit-plan";
import { buildLineRequiresDteSnapshot } from "@/features/sale-print-plan/build-line-requires-dte-snapshot";

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
    voucherData?: {
      kindId?: string | null;
      kindCode: string;
      kindName?: string | null;
      issuerName?: string | null;
      faceValue?: number | null;
      expiresAt?: string | null;
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
      if (p.type === "VOUCHER" && p.voucherData) {
        const vd = p.voucherData;
        row.voucherData = {
          kindId: vd.kindId?.trim() || undefined,
          kindCode: vd.kindCode?.trim().toUpperCase() ?? "",
          kindName: vd.kindName?.trim() || undefined,
          issuerName: vd.issuerName?.trim() || undefined,
          faceValue:
            vd.faceValue != null && Number.isFinite(Number(vd.faceValue))
              ? Math.round(Number(vd.faceValue))
              : undefined,
          expiresAt: vd.expiresAt?.trim() || undefined,
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
  /** Selector del cajero (puede diferir del documento efectivo enviado). */
  selectedSaleDocumentKind?: CreateSaleApiBody["saleDocumentKind"];
  loadedQuotation?: LoadedQuotationMeta | null;
  loadedPresaleTickets?: { id: string; code: string }[];
  posDelivery?: {
    deliveryZoneId: string;
    deliveryOccurrenceId: string;
    address: string;
    communeCode: string;
    communeName?: string | null;
    region?: string | null;
    latitude: number;
    longitude: number;
    shippingFee: number;
    zoneName: string;
    notes?: string | null;
  } | null;
  /** Cuenta salón cobrada: el backend omite stock de terminado PREPARADO. */
  diningOrderId?: string | null;
  /** Propina (fuera del total fiscal). */
  tipAmount?: number | null;
  tipSuggestedAmount?: number | null;
  tipPercentApplied?: number | null;
  tipStatus?: "NONE" | "SUGGESTED" | "ACCEPTED" | "CUSTOM" | "DECLINED" | null;
}): CreateSaleClientPayload {
  const priceListCheck = assertCartSinglePriceList(input.cartLines);
  if (!priceListCheck.ok) {
    throw new Error(priceListCheck.message);
  }

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

  const lineRequiresDte = buildLineRequiresDteSnapshot(input.cartLines);
  if (Object.keys(lineRequiresDte).length > 0) {
    metadata.lineRequiresDte = lineRequiresDte;
  }
  if (input.selectedSaleDocumentKind) {
    metadata.selectedSaleDocumentKind = input.selectedSaleDocumentKind;
  }
  const diningOrderId = input.diningOrderId?.trim() || "";
  if (diningOrderId) {
    metadata.diningOrderId = diningOrderId;
  }
  const tipAmount = Math.max(0, Math.round(Number(input.tipAmount) || 0));
  if (tipAmount > 0 || input.tipStatus) {
    metadata.tipAmount = tipAmount;
    if (input.tipSuggestedAmount != null) {
      metadata.tipSuggestedAmount = Math.max(
        0,
        Math.round(Number(input.tipSuggestedAmount) || 0),
      );
    }
    if (input.tipPercentApplied != null) {
      metadata.tipPercentApplied = Number(input.tipPercentApplied);
    }
    if (input.tipStatus) {
      metadata.tipStatus = input.tipStatus;
    }
  }
  const delivery = input.posDelivery;
  if (
    delivery &&
    !deferPayment &&
    delivery.deliveryZoneId?.trim() &&
    delivery.deliveryOccurrenceId?.trim()
  ) {
    metadata.posDelivery = {
      deliveryZoneId: delivery.deliveryZoneId.trim(),
      deliveryOccurrenceId: delivery.deliveryOccurrenceId.trim(),
      address: delivery.address.trim(),
      communeCode: delivery.communeCode.trim(),
      communeName: delivery.communeName?.trim() || null,
      region: delivery.region?.trim() || null,
      latitude: delivery.latitude,
      longitude: delivery.longitude,
      shippingFee: Math.round(Number(delivery.shippingFee) || 0),
      zoneName: delivery.zoneName.trim(),
      notes: delivery.notes?.trim() || null,
    };
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
