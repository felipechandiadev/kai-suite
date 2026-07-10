"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Dialog } from "@/shared/admin-shared";
import type { PosCartLine } from "@/app/(pos)/pos/ui/PosCartLineCard";
import type { PosPaymentLine, PosPaymentMethodId } from "@/features/pos-cart/pos-payment.types";
import type { PosSaleCustomer } from "@/features/customers/types/pos-customer.types";
import type { CompanyDetails } from "@/features/company/infrastructure/company.request";
import type { PosContextV1 } from "@/features/session/lib/pos-context-storage";
import type { EffectivePaymentMethod } from "@/features/pos-payment-methods/types/effective-payment-method.types";
import type { AppliedSnapshot } from "@/features/promotions/lib/discount-engine.types";
import type { LoadedQuotationMeta } from "@/features/pos-cart/cart-storage";
import type { FiscalBoletaPrintPreview } from "@/features/fiscal/types/fiscal-emission.types";
import type { SalePrintPlan } from "@/features/sale-print-plan/types";
import {
  executeSalePrintPlan,
  formatSalePrintPlanErrors,
} from "@/features/pos-print/lib/execute-sale-print-plan";
import { getFiscalBoletaPrintPreviewAction } from "@/features/fiscal/actions/reprint-fiscal-boleta.action";
import { shouldUseBackendApi } from "@/features/pos-offline/infrastructure/connectivity";
import { buildFiscalBoletaPreviewHtml } from "@/features/fiscal/print/build-fiscal-boleta-preview-html";
import { fiscalTimbrePdf417SvgForPreview } from "@/features/fiscal/print/fiscal-timbre-pdf417";
import {
  describePosDocumentPrintMode,
  formatPrintJobFailedMessage,
  getPosDocumentPrintMode,
  isPosDocumentPrintModeDocument,
  posDocumentPrintModeToWireFormat,
  PosDocumentPrintModeSelector,
  type PosDocumentPrintMode,
  type PrintFormat,
} from "@kai/print-service-client";
import {
  buildPosSaleDocumentHtml,
  printPosSaleDocument,
  printPosSaleDocumentAgentOrBrowser,
} from "@/features/pos-print/lib/pos-sale-document-print";
import {
  printPosSaleTicketAgentOrBrowser,
  printPosSaleTicketAgentOrBrowserFireAndForget,
} from "@/features/pos-print/lib/pos-sale-ticket-agent";
import {
  ticketOperatorHtml,
  ticketClosingMessageHtml,
  ticketFooterFolioDateHtml,
} from "@/features/pos-print/lib/ticket-receipt-footer";
import { thermalReceiptCssForFormat } from "@/features/pos-print/lib/thermal-receipt-ticket-styles";
import {
  printHtmlShowsLogo,
  type PosPrintHtmlOptions,
} from "@/features/pos-print/lib/pos-print-html-options";
import { PosPrintDocumentPreview } from "@/features/pos-print/ui/PosPrintDocumentPreview";
import { PosPrintPreviewReprintButton } from "@/features/pos-print/ui/PosPrintPreviewReprintButton";
import { receiptBarcodeSvgString } from "@/lib/receipt-barcode";
import { formatReceiptLineDisplayName } from "@/features/pos-print/lib/format-receipt-line-name";
import { formatInternalCreditPlanSubtitle } from "@/features/pos-payment/lib/internal-credit-plan";

const FALLBACK_METHOD_LABEL: Record<PosPaymentMethodId, string> = {
  CASH: "Efectivo",
  CREDIT_CARD: "Tarjeta crédito",
  DEBIT_CARD: "Tarjeta débito",
  TRANSFER: "Transferencia",
  CHECK: "Cheque",
  INTERNAL_CREDIT: "Crédito interno",
  CUSTOMER_CREDIT_NOTE: "Nota de crédito cliente",
  ORDER_ADVANCE: "Abono por encargo",
};

function formatMoney(n: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function resolveReceiptLogoUrl(companyLogoUrl: string | null | undefined, origin: string): string {
  const appDefault = `${origin}/logo.png`;
  const raw = companyLogoUrl?.trim();
  if (!raw) return appDefault;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("/")) return `${origin}${raw}`;
  return raw;
}

export type PosSaleReceiptLine = {
  productName: string;
  attributes: string[];
  quantity: number;
  unitSymbol: string | null;
  unitPriceWithTax: number;
  lineGross: number;
  discountAmount: number;
  discountLabel: string | null;
};

export type PosSaleReceiptPayment = {
  label: string;
  amount: number;
  reference: string;
  detail: string | null;
};

export type PosSaleReceiptPromotion = {
  code: string;
  name: string;
  amount: number;
};

export type PosSaleReceiptDocumentKind = "sale" | "backorder";

export type PosSaleReceiptBackorder = {
  percent: number;
  depositAmount: number;
  orderTotal: number;
};

export type PosSaleReceiptData = {
  /** Folio interno de la venta (`documentNumber` de la transacción cuando existe). */
  folio: string;
  /** ID de transacción en backend (reimpresión boleta SII). */
  transactionId?: string | null;
  /** Folio SII de boleta electrónica cuando la emisión fue exitosa. */
  fiscalFolio?: string | null;
  fiscalBoletaWarning?: string | null;
  /** Vista previa para imprimir boleta electrónica al cerrar la venta. */
  fiscalPrintPreview?: FiscalBoletaPrintPreview | null;
  /** Ticket complementario (líneas no-DTE) en ventas mixtas. */
  ticketPrintPreview?: PosSaleReceiptData | null;
  /** Plan de impresión resuelto en POS. */
  printPlan?: SalePrintPlan;
  issuedAtIso: string;
  documentKind: PosSaleReceiptDocumentKind;
  backorder?: PosSaleReceiptBackorder | null;
  company: {
    razonSocial: string;
    nombreFantasia: string | null;
    rut: string | null;
    businessActivity: string | null;
    logoUrl: string | null;
    address?: string | null;
    mail?: string | null;
    phone?: string | null;
  };
  pos: {
    pointOfSaleName: string | null;
    branchName: string | null;
    priceListLabel: string | null;
  };
  customer: PosSaleCustomer | null;
  quotation: LoadedQuotationMeta | null;
  lines: PosSaleReceiptLine[];
  promotions: PosSaleReceiptPromotion[];
  totals: {
    subtotalNet: number;
    subtotalGross: number;
    taxes: number;
    lineDiscounts: number;
    orderDiscount: number;
    discountsTotal: number;
    total: number;
    paid: number;
    change: number;
  };
  payments: PosSaleReceiptPayment[];
  /** Venta emitida sin cobro inmediato (AR). */
  collectionPending?: boolean;
  /** Cobro consolidado de varias ventas pendientes. */
  arCollection?: Array<{ folio: string; amount: number }> | null;
  /** Cobro consolidado de cuotas pendientes. */
  quotaCollection?: Array<{ folio: string; dueDate?: string | null; amount: number }> | null;
  /** Plan de cobro pactado en venta con crédito interno. */
  creditInstallmentPlan?: Array<{
    installmentNumber: number;
    dueDate: string;
    amount: number;
  }> | null;
  /** Liquidación de saldo NC al cliente (egreso en caja). */
  ncPayout?: Array<{ folio: string; amount: number }> | null;
  /** Operador POS al emitir/imprimir (pie «Operador:»). */
  operatorName?: string | null;
};

export type PosSaleReceiptSnapshotInput = {
  lines: PosCartLine[];
  payments: PosPaymentLine[];
  customer: PosSaleCustomer | null;
  company: CompanyDetails | null;
  posContext: PosContextV1 | null;
  appliedPromotions: AppliedSnapshot[];
  orderDiscount: number;
  lineDiscountsTotal: number;
  totals: {
    net: number;
    gross: number;
    taxes: number;
    discounts: number;
    saleTotal: number;
    appliedTotal: number;
    overpay: number;
  };
  methodsById: Map<string, EffectivePaymentMethod>;
  loadedQuotation: LoadedQuotationMeta | null;
  /** Si la venta ya se registró en backend, el folio/documento oficial (p. ej. `transaction.documentNumber`). */
  saleFolio?: string | null;
  transactionId?: string | null;
  fiscalFolio?: string | null;
  fiscalBoletaWarning?: string | null;
  fiscalPrintPreview?: FiscalBoletaPrintPreview | null;
  ticketPrintPreview?: PosSaleReceiptData | null;
  printPlan?: SalePrintPlan;
  documentKind?: PosSaleReceiptDocumentKind;
  backorder?: PosSaleReceiptBackorder | null;
  collectionPending?: boolean;
  arCollection?: Array<{ folio: string; amount: number }> | null;
  quotaCollection?: Array<{ folio: string; dueDate?: string | null; amount: number }> | null;
  ncPayout?: Array<{ folio: string; amount: number }> | null;
  operatorName?: string | null;
};

function paymentLabel(
  p: PosPaymentLine,
  methodsById: Map<string, EffectivePaymentMethod>,
): string {
  const cfg = p.companyPaymentMethodId ? methodsById.get(p.companyPaymentMethodId) : null;
  if (cfg?.label) return cfg.label;
  const t = p.type as PosPaymentMethodId;
  return FALLBACK_METHOD_LABEL[t] ?? String(p.type);
}

function bankLabelForKey(company: CompanyDetails | null, key: string | null | undefined): string | null {
  if (!key?.trim() || !company?.bankAccounts?.length) return null;
  const acc = company.bankAccounts.find((a) => (a.accountKey ?? "").trim() === key.trim());
  if (!acc) return null;
  return `${acc.bankName} · ${acc.accountType} · ${acc.accountNumber}`;
}

function paymentDetail(
  p: PosPaymentLine,
  company: CompanyDetails | null,
): string | null {
  const bits: string[] = [];
  if (p.type === "TRANSFER") {
    const bl = bankLabelForKey(company, p.bankAccountKey);
    if (bl) bits.push(bl);
  }
  if (p.type === "CHECK" && p.checkData) {
    const cd = p.checkData;
    const parts = [
      cd.checkNumber?.trim() ? `N° ${cd.checkNumber.trim()}` : "",
      cd.bankName?.trim() ? cd.bankName.trim() : "",
      cd.drawerName?.trim() ? `Librador: ${cd.drawerName.trim()}` : "",
      cd.dueDate?.trim() ? `Vence: ${cd.dueDate.trim()}` : "",
    ].filter(Boolean);
    if (parts.length) bits.push(parts.join(" · "));
  }
  if (p.type === "INTERNAL_CREDIT" && p.internalCreditPlan) {
    bits.push(formatInternalCreditPlanSubtitle(p.internalCreditPlan));
  }
  if (p.reference?.trim()) bits.push(`Ref: ${p.reference.trim()}`);
  return bits.length ? bits.join(" | ") : null;
}

function priceListLabel(ctx: PosContextV1 | null): string | null {
  if (!ctx?.priceListId?.trim()) return null;
  const id = ctx.priceListId.trim();
  const lists = ctx.priceLists;
  if (Array.isArray(lists)) {
    const hit = lists.find((l) => l?.id === id);
    if (hit?.name?.trim()) return hit.name.trim();
  }
  return id;
}

export function buildPosSaleReceiptSnapshot(input: PosSaleReceiptSnapshotInput): PosSaleReceiptData {
  const provisionalFolio = `POS-${Date.now().toString(36).toUpperCase()}`;
  const folio = input.saleFolio?.trim() ? input.saleFolio.trim() : provisionalFolio;
  const issuedAtIso = new Date().toISOString();
  const c = input.company;

  const lines: PosSaleReceiptLine[] = input.lines.map((l) => {
    const q = Number(l.quantity) || 0;
    const gross = (Number(l.unitPriceWithTax) || 0) * q;
    const d = l.discount;
    const attrBits = (
      l.attributes?.map((a: { attributeValue?: string | null }) =>
        String(a.attributeValue ?? "").trim(),
      ) ?? []
    ).filter(Boolean);
    return {
      productName: l.productName,
      attributes: attrBits,
      quantity: q,
      unitSymbol: l.unitSymbol,
      unitPriceWithTax: Number(l.unitPriceWithTax) || 0,
      lineGross: gross,
      discountAmount: d?.discountAmount ?? 0,
      discountLabel:
        d && (d.promotionCode || d.promotionName)
          ? [d.promotionCode, d.promotionName].filter(Boolean).join(" · ")
          : null,
    };
  });

  const promotions: PosSaleReceiptPromotion[] = input.appliedPromotions.map((a) => ({
    code: a.promotionCode,
    name: a.promotionName,
    amount: a.amountDiscounted,
  }));

  const payments: PosSaleReceiptPayment[] = input.payments
    .filter((p) => (Number(p.amount) || 0) > 0)
    .map((p) => ({
      label: paymentLabel(p, input.methodsById),
      amount: p.amount,
      reference: p.reference?.trim() ?? "",
      detail: paymentDetail(p, input.company),
    }));

  const documentKind = input.documentKind ?? "sale";

  const creditLine = input.payments.find(
    (p) =>
      p.type === "INTERNAL_CREDIT" &&
      (p.internalCreditPlan?.scheduledLines?.length ?? 0) > 0,
  );

  return {
    folio,
    transactionId: input.transactionId?.trim() ? input.transactionId.trim() : null,
    fiscalFolio: input.fiscalFolio?.trim() ? input.fiscalFolio.trim() : null,
    fiscalBoletaWarning: input.fiscalBoletaWarning?.trim() ? input.fiscalBoletaWarning.trim() : null,
    fiscalPrintPreview: input.fiscalPrintPreview ?? null,
    ticketPrintPreview: input.ticketPrintPreview ?? null,
    printPlan: input.printPlan ?? "TICKET_ONLY",
    issuedAtIso,
    documentKind,
    backorder: input.backorder ?? null,
    company: {
      razonSocial: c?.razonSocial?.trim() || "Empresa",
      nombreFantasia: c?.nombreFantasia?.trim() ? c.nombreFantasia.trim() : null,
      rut: c?.rut?.trim() ? c.rut.trim() : null,
      businessActivity: c?.businessActivity?.trim() ? c.businessActivity.trim() : null,
      logoUrl: c?.logoUrl?.trim() ? c.logoUrl.trim() : null,
      address: c?.address?.trim() ? c.address.trim() : null,
      mail: c?.mail?.trim() ? c.mail.trim() : null,
      phone: c?.phone?.trim() ? c.phone.trim() : null,
    },
    pos: {
      pointOfSaleName: input.posContext?.pointOfSaleName?.trim() || null,
      branchName: input.posContext?.branchName?.trim() || null,
      priceListLabel: priceListLabel(input.posContext),
    },
    customer: input.customer,
    quotation: input.loadedQuotation,
    lines,
    promotions,
    totals: {
      subtotalNet: input.totals.net,
      subtotalGross: input.totals.gross,
      taxes: input.totals.taxes,
      lineDiscounts: input.lineDiscountsTotal,
      orderDiscount: input.orderDiscount,
      discountsTotal: input.totals.discounts,
      total: input.totals.saleTotal,
      paid: input.totals.appliedTotal,
      change: input.totals.overpay,
    },
    payments,
    collectionPending: input.collectionPending === true,
    arCollection: input.arCollection?.length ? input.arCollection : null,
    quotaCollection: input.quotaCollection?.length ? input.quotaCollection : null,
    ncPayout: input.ncPayout?.length ? input.ncPayout : null,
    creditInstallmentPlan: creditLine?.internalCreditPlan?.scheduledLines?.length
      ? creditLine.internalCreditPlan.scheduledLines
      : null,
    operatorName: input.operatorName?.trim() ? input.operatorName.trim() : null,
  };
}

export function buildPosSaleReceiptHtml(
  data: PosSaleReceiptData,
  origin: string,
  format: PrintFormat = "ticket_80mm",
  options?: PosPrintHtmlOptions,
): string {
  const isBackorder = data.documentKind === "backorder";
  const isArCollection = Boolean(data.arCollection?.length);
  const isQuotaCollection = Boolean(data.quotaCollection?.length);
  const isNcPayout = Boolean(data.ncPayout?.length);
  const showLogo = printHtmlShowsLogo(options);
  const logo = showLogo ? resolveReceiptLogoUrl(data.company.logoUrl, origin) : "";
  const displayName = data.company.nombreFantasia || data.company.razonSocial;
  const receiptHeading = isNcPayout
    ? "DEVOLUCIÓN SALDO NC"
    : isQuotaCollection
      ? "COBRO DE CUOTAS"
      : isArCollection
        ? "COBRO PENDIENTE"
    : isBackorder
      ? "Detalle de Encargo"
      : "Detalle de Venta";

  const lineRows = data.lines
    .map((l) => {
      const name = formatReceiptLineDisplayName(l.productName, l.attributes);
      const unit = l.unitSymbol?.trim() ? ` ${l.unitSymbol.trim()}` : "";
      const qtyLine = `${l.quantity} × ${formatMoney(l.unitPriceWithTax)}${unit}`;
      const disc =
        l.discountAmount > 0.01
          ? `<div class="muted" style="margin-top:1px;">Desc.: ${escapeHtml(l.discountLabel || "Promo")} · −${formatMoney(l.discountAmount)}</div>`
          : "";
      return `<tr>
        <td class="line-block">
          <div class="line-name">${escapeHtml(name)}</div>
          <div class="line-detail">
            <span class="line-qty">${escapeHtml(qtyLine)}</span>
            <span class="line-total">${formatMoney(l.lineGross)}</span>
          </div>
          ${disc}
        </td>
      </tr>`;
    })
    .join("");

  const promoRows =
    data.promotions.length > 0
      ? data.promotions
          .map(
            (p) =>
              `<div class="row"><span>${escapeHtml(p.code)} ${escapeHtml(p.name)}</span><span>−${formatMoney(p.amount)}</span></div>`,
          )
          .join("")
      : "";

  const payRows = data.payments
    .map((p) => {
      const det = p.detail ? `<div class="muted" style="margin-top:2px;">${escapeHtml(p.detail)}</div>` : "";
      return `<div class="row"><span>${escapeHtml(p.label)}</span><span>${formatMoney(p.amount)}</span></div>${det}`;
    })
    .join("");

  const bo = data.backorder;

  const collectionPendingBanner = data.collectionPending
    ? `<p class="center" style="font-weight:700;margin:6px 0;">COBRO PENDIENTE</p>
       <p class="center muted">Saldo por cobrar: ${formatMoney(data.totals.total)}</p>`
    : "";

  const arCollectionRows =
    data.arCollection?.map(
      (row) =>
        `<div class="row"><span>${escapeHtml(row.folio)}</span><span>${formatMoney(row.amount)}</span></div>`,
    ).join("") ?? "";
  const arCollectionBlock = arCollectionRows
    ? `<div class="sep"></div>
       <div class="section-title">Ventas cobradas</div>
       ${arCollectionRows}`
    : "";

  const quotaCollectionRows =
    data.quotaCollection?.map((row) => {
      const due =
        row.dueDate?.trim()
          ? ` · vence ${escapeHtml(new Date(row.dueDate).toLocaleDateString("es-CL"))}`
          : "";
      return `<div class="row"><span>${escapeHtml(row.folio)}${due}</span><span>${formatMoney(row.amount)}</span></div>`;
    }).join("") ?? "";
  const quotaCollectionBlock = quotaCollectionRows
    ? `<div class="sep"></div>
       <div class="section-title">Cuotas cobradas</div>
       ${quotaCollectionRows}`
    : "";

  const creditPlanRows =
    data.creditInstallmentPlan?.map((row) => {
      const due = row.dueDate?.trim()
        ? new Date(`${row.dueDate}T12:00:00`).toLocaleDateString("es-CL")
        : "";
      return `<div class="row"><span>Cuota ${row.installmentNumber}${due ? ` · ${escapeHtml(due)}` : ""}</span><span>${formatMoney(row.amount)}</span></div>`;
    }).join("") ?? "";
  const creditPlanBlock = creditPlanRows
    ? `<div class="sep"></div>
       <div class="section-title">Plan de cobro (crédito interno)</div>
       ${creditPlanRows}`
    : "";

  const ncPayoutRows =
    data.ncPayout?.map(
      (row) =>
        `<div class="row"><span>${escapeHtml(row.folio)}</span><span>${formatMoney(row.amount)}</span></div>`,
    ).join("") ?? "";
  const ncPayoutBlock = ncPayoutRows
    ? `<div class="sep"></div>
       <div class="section-title">Notas de crédito liquidadas</div>
       ${ncPayoutRows}`
    : "";

  const paymentsSection =
    payRows || data.totals.change > 0.01
      ? `<div class="sep"></div>
         <div class="section-title">Pagos</div>
         ${payRows}
         ${data.totals.change > 0.01 ? `<div class="row"><span>Vuelto</span><span>${formatMoney(data.totals.change)}</span></div>` : ""}`
      : "";

  const fiscalBodyBanner = [
    data.fiscalFolio?.trim()
      ? `<p class="center muted">Boleta SII: ${escapeHtml(data.fiscalFolio.trim())}</p>`
      : "",
    data.fiscalBoletaWarning?.trim()
      ? `<p class="center" style="color:#b45309">${escapeHtml(data.fiscalBoletaWarning.trim())}</p>`
      : "",
  ].join("");

  const closingMessage = isNcPayout
    ? "Comprobante de devolución de saldo NC"
    : isArCollection || isQuotaCollection
      ? "Comprobante de cobro"
      : isBackorder
        ? ""
        : data.collectionPending
          ? "Venta registrada — cobro pendiente"
          : "Gracias por su compra";

  const cust = data.customer;
  const custBlock =
    cust && (cust.name?.trim() || cust.document?.trim() || cust.phone?.trim())
      ? `<div class="sep"></div>
         <div class="section-title">Cliente</div>
         ${cust.name?.trim() ? `<div class="row"><span>Nombre</span><span class="tright" style="max-width:48mm;text-align:right;">${escapeHtml(cust.name.trim())}</span></div>` : ""}
         ${cust.document?.trim() ? `<div class="row"><span>Documento</span><span>${escapeHtml(cust.document.trim())}</span></div>` : ""}
         ${cust.phone?.trim() ? `<div class="row"><span>Teléfono</span><span>${escapeHtml(cust.phone.trim())}</span></div>` : ""}
         ${cust.email?.trim() ? `<div class="row"><span>Email</span><span class="tright" style="max-width:48mm;word-break:break-all;text-align:right;">${escapeHtml(cust.email.trim())}</span></div>` : ""}`
      : "";

  const quot = data.quotation;
  const quotBlock =
    quot && quot.documentNumber?.trim()
      ? `<div class="sep"></div>
         <div class="section-title">Cotización origen</div>
         <div class="row"><span>Folio</span><span>${escapeHtml(quot.documentNumber.trim())}</span></div>
         ${quot.validUntil?.trim() ? `<div class="row"><span>Válida hasta</span><span>${escapeHtml(quot.validUntil.trim())}</span></div>` : ""}`
      : "";

  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/>
<title>Venta ${escapeHtml(data.folio)}</title>
<style>${thermalReceiptCssForFormat(format)}</style></head><body>
<div class="receipt">
  ${showLogo ? `<img class="logo" src="${escapeHtml(logo)}" alt="" />` : ""}
  <p class="store">${escapeHtml(displayName)}</p>
  ${data.company.razonSocial && data.company.nombreFantasia ? `<p class="legal">${escapeHtml(data.company.razonSocial)}</p>` : ""}
  ${data.company.rut ? `<p class="legal">RUT: ${escapeHtml(data.company.rut)}</p>` : ""}
  ${data.company.businessActivity ? `<p class="legal">${escapeHtml(data.company.businessActivity)}</p>` : ""}
  ${fiscalBodyBanner}
  ${custBlock}
  ${quotBlock}
  <div class="sep"></div>
  <div class="section-title" style="text-transform:none">${escapeHtml(receiptHeading)}</div>
  <table class="lines" role="presentation">${lineRows}</table>
  ${promoRows ? `<div class="sep"></div><div class="section-title">Promociones</div>${promoRows}` : ""}
  ${collectionPendingBanner ? `<div class="sep"></div>${collectionPendingBanner}` : ""}
  <div class="sep"></div>
  <div class="row"><span>Subtotal neto</span><span>${formatMoney(data.totals.subtotalNet)}</span></div>
  <div class="row"><span>Impuestos</span><span>${formatMoney(data.totals.taxes)}</span></div>
  ${data.totals.lineDiscounts > 0.01 ? `<div class="row"><span>Descuentos línea</span><span>−${formatMoney(data.totals.lineDiscounts)}</span></div>` : ""}
  ${data.totals.orderDiscount > 0.01 ? `<div class="row"><span>Descuento orden</span><span>−${formatMoney(data.totals.orderDiscount)}</span></div>` : ""}
  ${
    isBackorder && data.backorder
      ? `<div class="row"><span>Total pedido</span><span>${formatMoney(data.backorder.orderTotal)}</span></div>
         <div class="row tot"><span>Abono</span><span>${formatMoney(data.backorder.depositAmount)}</span></div>
         <div class="row"><span>Saldo pendiente</span><span>${formatMoney(Math.max(0, data.backorder.orderTotal - data.backorder.depositAmount))}</span></div>`
      : `<div class="row tot"><span>TOTAL</span><span>${formatMoney(data.totals.total)}</span></div>`
  }
  ${paymentsSection}
  ${arCollectionBlock}
  ${quotaCollectionBlock}
  ${creditPlanBlock}
  ${ncPayoutBlock}
  <div class="sep"></div>
  <div class="barcode-section"><div class="barcode-wrap">${receiptBarcodeSvgString(data.folio)}</div></div>
  ${ticketFooterFolioDateHtml(data.folio, data.issuedAtIso)}
  ${ticketClosingMessageHtml(closingMessage)}
  ${ticketOperatorHtml(data.operatorName)}
</div>
</body></html>`;
}

export function printPosSaleReceipt(data: PosSaleReceiptData, mode?: PosDocumentPrintMode): void {
  if (typeof window === "undefined") return;
  const kind = data.documentKind === "backorder" ? "backorder" : "sale";
  const printMode = mode ?? getPosDocumentPrintMode(kind);
  const format = posDocumentPrintModeToWireFormat(printMode);
  const folio = data.folio.trim() || "ticket";
  printPosSaleTicketAgentOrBrowserFireAndForget(data, {
    filename: `${folio}.escpos`,
    documentType: data.documentKind === "backorder" ? "BACKORDER" : "SALE",
    internalFolio: folio,
    format,
  });
}

type DialogProps = {
  open: boolean;
  data: PosSaleReceiptData | null;
  onClose: () => void;
};

function resolveSalePrintMode(data: PosSaleReceiptData): PosDocumentPrintMode {
  const kind = data.documentKind === "backorder" ? "backorder" : "sale";
  return getPosDocumentPrintMode(kind);
}

function printSaleByMode(data: PosSaleReceiptData, mode: PosDocumentPrintMode) {
  const format = posDocumentPrintModeToWireFormat(mode);
  if (isPosDocumentPrintModeDocument(mode)) {
    printPosSaleDocument(data, format);
  } else {
    printPosSaleReceipt(data, mode);
  }
}

async function autoPrintSaleByMode(data: PosSaleReceiptData, mode: PosDocumentPrintMode): Promise<void> {
  const folio = data.folio.trim() || "ticket";
  const format = posDocumentPrintModeToWireFormat(mode);
  if (isPosDocumentPrintModeDocument(mode)) {
    await printPosSaleDocumentAgentOrBrowser(data, format);
    return;
  }
  await printPosSaleTicketAgentOrBrowser(data, {
    filename: `${folio}.escpos`,
    documentType: data.documentKind === "backorder" ? "BACKORDER" : "SALE",
    internalFolio: folio,
    format,
  });
}

function shouldRetryAutoPrint(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes("timeout") ||
    msg.includes("not_connected") ||
    msg.includes("usb_") ||
    msg.includes("connection")
  );
}

/**
 * Ventas: imprime según printPlan (boleta, ticket o ambos).
 */
async function autoPrintSaleReceipt(snapshot: PosSaleReceiptData): Promise<{
  errorMessage: string | null;
}> {
  if (snapshot.documentKind !== "sale") {
    const mode = resolveSalePrintMode(snapshot);
    try {
      await autoPrintSaleByMode(snapshot, mode);
      return { errorMessage: null };
    } catch (e) {
      const raw = e instanceof Error ? e.message : "print_failed";
      return {
        errorMessage: `No se pudo enviar el ticket al agente. ${formatPrintJobFailedMessage(raw)} Usá «Imprimir de nuevo».`,
      };
    }
  }

  const printPlan = snapshot.printPlan ?? "TICKET_ONLY";
  let receipt = snapshot;
  if (
    (printPlan === "BOLETA_ONLY" || printPlan === "BOLETA_AND_TICKET") &&
    !receipt.fiscalPrintPreview
  ) {
    const txId = receipt.transactionId?.trim();
    if (txId && shouldUseBackendApi()) {
      try {
        const res = await getFiscalBoletaPrintPreviewAction(txId);
        if (res.success) {
          receipt = { ...receipt, fiscalPrintPreview: res.preview };
        }
      } catch {
        // sin preview remota
      }
    }
  }

  const ticketReceipt =
    printPlan === "BOLETA_AND_TICKET"
      ? snapshot.ticketPrintPreview ?? null
      : printPlan === "TICKET_ONLY"
        ? snapshot.ticketPrintPreview ?? snapshot
        : null;

  const result = await executeSalePrintPlan({
    printPlan,
    receipt,
    ticketReceipt,
  });

  return { errorMessage: formatSalePrintPlanErrors(result) };
}

const FISCAL_BOLETA_PREVIEW_FORMAT: PrintFormat = "ticket_80mm";

export function PosSaleReceiptDialog({ open, data, onClose }: DialogProps) {
  const autoPrintForFolioRef = useRef<string | null>(null);
  const receiptDataRef = useRef(data);
  receiptDataRef.current = data;
  const [printMode, setPrintMode] = useState<PosDocumentPrintMode>("ticket");
  const [autoPrintStatus, setAutoPrintStatus] = useState<string | null>(null);
  const [fiscalPrintBusy, setFiscalPrintBusy] = useState(false);
  const [fiscalBoletaPreviewHtml, setFiscalBoletaPreviewHtml] = useState<string | null>(null);

  const fiscalPrintPreview = data?.fiscalPrintPreview ?? null;
  const ticketPrintPreview = data?.ticketPrintPreview ?? null;
  const printPlan = data?.printPlan ?? "TICKET_ONLY";
  const showingFiscalBoletaPreview = Boolean(fiscalPrintPreview);
  const showingDualPreview = printPlan === "BOLETA_AND_TICKET" && Boolean(ticketPrintPreview);
  const [ticketPreviewHtml, setTicketPreviewHtml] = useState<string | null>(null);

  useEffect(() => {
    if (!fiscalPrintPreview) {
      setFiscalBoletaPreviewHtml(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const pdf417Svg = await fiscalTimbrePdf417SvgForPreview(
        fiscalPrintPreview,
        FISCAL_BOLETA_PREVIEW_FORMAT,
      );
      if (cancelled) return;
      setFiscalBoletaPreviewHtml(
        buildFiscalBoletaPreviewHtml(fiscalPrintPreview, FISCAL_BOLETA_PREVIEW_FORMAT, pdf417Svg),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [fiscalPrintPreview]);

  useEffect(() => {
    const ticketData = ticketPrintPreview ?? (showingDualPreview ? null : data);
    if (!ticketPrintPreview || typeof window === "undefined") {
      setTicketPreviewHtml(null);
      return;
    }
    setTicketPreviewHtml(
      buildPosSaleReceiptHtml(ticketPrintPreview, window.location.origin, "ticket_80mm", {
        showLogo: false,
      }),
    );
  }, [ticketPrintPreview, showingDualPreview, data]);

  useEffect(() => {
    if (data) {
      setPrintMode(resolveSalePrintMode(data));
    }
  }, [data?.folio, data?.documentKind]);

  useEffect(() => {
    if (!open) {
      setAutoPrintStatus(null);
    }
  }, [open]);

  const wireFormat = showingFiscalBoletaPreview
    ? FISCAL_BOLETA_PREVIEW_FORMAT
    : posDocumentPrintModeToWireFormat(printMode);
  const isDocument = !showingFiscalBoletaPreview && isPosDocumentPrintModeDocument(printMode);

  const previewSrcDoc = useMemo(() => {
    if (!data || typeof window === "undefined") return null;
    if (fiscalPrintPreview) {
      return fiscalBoletaPreviewHtml;
    }
    return isDocument
      ? buildPosSaleDocumentHtml(data, wireFormat)
      : buildPosSaleReceiptHtml(data, window.location.origin, wireFormat, { showLogo: false });
  }, [data, fiscalPrintPreview, fiscalBoletaPreviewHtml, isDocument, wireFormat]);

  useEffect(() => {
    if (!open || !data) {
      if (!open) {
        autoPrintForFolioRef.current = null;
      }
      return;
    }
    const folio = data.folio.trim();
    if (!folio || autoPrintForFolioRef.current === folio) return;
    autoPrintForFolioRef.current = folio;
    const t = window.setTimeout(() => {
      void (async () => {
        const snapshot = receiptDataRef.current;
        if (!snapshot) return;

        const runPrint = async () => {
          const { errorMessage } = await autoPrintSaleReceipt(snapshot);
          if (errorMessage) {
            setAutoPrintStatus(errorMessage);
          } else {
            setAutoPrintStatus(null);
          }
        };

        try {
          await runPrint();
        } catch (firstErr) {
          if (!shouldRetryAutoPrint(firstErr)) {
            const raw = firstErr instanceof Error ? firstErr.message : "print_failed";
            setAutoPrintStatus(
              `No se pudo enviar el comprobante al agente. ${formatPrintJobFailedMessage(raw)} Usá «Imprimir de nuevo».`,
            );
          } else {
            await new Promise((resolve) => window.setTimeout(resolve, 400));
            await runPrint();
          }
        }
      })();
    }, 100);
    return () => clearTimeout(t);
  }, [open, data?.folio, data?.transactionId, data?.documentKind]);

  const hasFiscalBoletaOnRecord = Boolean(
    data?.documentKind === "sale" &&
      (data.fiscalFolio?.trim() || data.fiscalPrintPreview),
  );
  const reprintLabel =
    printPlan === "BOLETA_AND_TICKET"
      ? "Imprimir ambos"
      : hasFiscalBoletaOnRecord
        ? "Imprimir boleta SII"
        : "Imprimir ticket";

  async function handleReprintComprobante(): Promise<void> {
    const snapshot = receiptDataRef.current;
    if (!snapshot) return;
    setFiscalPrintBusy(true);
    try {
      const { errorMessage } = await autoPrintSaleReceipt(snapshot);
      setAutoPrintStatus(errorMessage);
    } finally {
      setFiscalPrintBusy(false);
    }
  }

  if (!data) return null;

  const dialogTitle = data.ncPayout?.length
    ? "Devolución registrada"
    : data.quotaCollection?.length
      ? "Cobro de cuotas registrado"
      : data.arCollection?.length
        ? "Cobro registrado"
      : data.documentKind === "backorder"
        ? "Encargo registrado"
        : "Venta registrada";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={dialogTitle}
      size="lg"
      scroll="paper"
      data-test-id="pos-payment-success-dialog"
      actions={
        <>
          <PosPrintPreviewReprintButton
            onClick={() => void handleReprintComprobante()}
            disabled={fiscalPrintBusy}
            isLoading={fiscalPrintBusy}
            title={reprintLabel}
            data-test-id="pos-sale-receipt-reprint-comprobante"
          />
          <Button type="button" variant="primary" onClick={onClose}>
            Volver al POS
          </Button>
        </>
      }
    >
      <div className="grid gap-4 text-sm">
        {showingDualPreview ? (
          <p className="text-xs text-muted-foreground">
            Venta mixta: comprobante tributario (SII) + ticket interno (ítems no tributarios).
          </p>
        ) : showingFiscalBoletaPreview ? (
          <p className="mb-2 text-xs text-muted-foreground">
            Comprobante:{" "}
            <span className="font-medium text-foreground">
              Boleta electrónica SII
              {data.fiscalFolio?.trim() ? ` · folio ${data.fiscalFolio.trim()}` : ""}
            </span>
          </p>
        ) : (
          <>
            <p className="mb-2 text-xs text-muted-foreground">
              Modo:{" "}
              <span className="font-medium text-foreground">
                {describePosDocumentPrintMode(printMode)}
              </span>
            </p>
            <PosDocumentPrintModeSelector
              value={printMode}
              onChange={setPrintMode}
              data-test-id="pos-sale-receipt-print-format"
            />
          </>
        )}
        {autoPrintStatus ? (
          <p className="text-sm text-destructive" data-test-id="pos-sale-auto-print-error">
            {autoPrintStatus}
          </p>
        ) : null}
        {showingFiscalBoletaPreview ? (
          <PosPrintDocumentPreview
            html={fiscalBoletaPreviewHtml}
            format={FISCAL_BOLETA_PREVIEW_FORMAT}
            title="Vista previa boleta SII"
            loadingLabel="Preparando vista previa de boleta…"
            data-test-id="pos-sale-receipt-fiscal-preview"
          />
        ) : null}
        {showingDualPreview && ticketPreviewHtml ? (
          <PosPrintDocumentPreview
            html={ticketPreviewHtml}
            format="ticket_80mm"
            title="Vista previa ticket interno (no tributario)"
            loadingLabel="Preparando ticket complementario…"
            data-test-id="pos-sale-receipt-ticket-preview"
          />
        ) : null}
        {!showingFiscalBoletaPreview && !showingDualPreview ? (
          <PosPrintDocumentPreview
            html={previewSrcDoc}
            format={wireFormat}
            title={isDocument ? "Vista previa documento" : "Vista previa ticket"}
            loadingLabel="Preparando vista previa…"
            data-test-id="pos-sale-receipt-preview"
          />
        ) : null}
      </div>
    </Dialog>
  );
}
