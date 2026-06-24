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
import {
  describePrintFormat,
  formatPrintJobFailedMessage,
  getPosDocumentPrintFormat,
  isDocumentPrintFormat,
  PrintFormatSelector,
  type PrintFormat,
} from "@flowstore/print-service-client";
import {
  buildPosSaleDocumentHtml,
  printPosSaleDocument,
  printPosSaleDocumentAgentOrBrowser,
} from "@/features/pos-print/lib/pos-sale-document-print";
import {
  printPosSaleTicketAgentOrBrowser,
  printPosSaleTicketAgentOrBrowserFireAndForget,
} from "@/features/pos-print/lib/pos-sale-ticket-agent";
import { thermalReceiptCssForFormat } from "@/features/pos-print/lib/thermal-receipt-ticket-styles";
import { thermalPreviewWidthCss } from "@/features/pos-print/lib/document-print-format";
import { receiptBarcodeSvgString } from "@/lib/receipt-barcode";
import { formatReceiptLineDisplayName } from "@/features/pos-print/lib/format-receipt-line-name";

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
  /** Liquidación de saldo NC al cliente (egreso en caja). */
  ncPayout?: Array<{ folio: string; amount: number }> | null;
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
  documentKind?: PosSaleReceiptDocumentKind;
  backorder?: PosSaleReceiptBackorder | null;
  collectionPending?: boolean;
  arCollection?: Array<{ folio: string; amount: number }> | null;
  ncPayout?: Array<{ folio: string; amount: number }> | null;
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

  return {
    folio,
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
    ncPayout: input.ncPayout?.length ? input.ncPayout : null,
  };
}

export function buildPosSaleReceiptHtml(
  data: PosSaleReceiptData,
  origin: string,
  format: PrintFormat = "ticket_80mm",
): string {
  const isBackorder = data.documentKind === "backorder";
  const isArCollection = Boolean(data.arCollection?.length);
  const isNcPayout = Boolean(data.ncPayout?.length);
  const logo = resolveReceiptLogoUrl(data.company.logoUrl, origin);
  const displayName = data.company.nombreFantasia || data.company.razonSocial;
  const receiptHeading = isNcPayout
    ? "DEVOLUCIÓN SALDO NC"
    : isArCollection
    ? "COBRO PENDIENTE"
    : isBackorder
      ? "ENCARGO"
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
  const backorderHeaderLine =
    isBackorder && bo
      ? `<p class="center muted">Abono: ${formatMoney(bo.depositAmount)}${bo.percent > 0 ? ` · ${bo.percent}%` : ""}</p>`
      : "";

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
  <img class="logo" src="${escapeHtml(logo)}" alt="" />
  <p class="store">${escapeHtml(displayName)}</p>
  ${data.company.razonSocial && data.company.nombreFantasia ? `<p class="legal">${escapeHtml(data.company.razonSocial)}</p>` : ""}
  ${data.company.rut ? `<p class="legal">RUT: ${escapeHtml(data.company.rut)}</p>` : ""}
  ${data.company.businessActivity ? `<p class="legal">${escapeHtml(data.company.businessActivity)}</p>` : ""}
  <div class="sep"></div>
  <p class="center muted">Folio: ${escapeHtml(data.folio)}</p>
  <p class="center muted">${escapeHtml(formatDateTime(data.issuedAtIso))}</p>
  ${collectionPendingBanner}
  ${backorderHeaderLine}
  ${custBlock}
  ${quotBlock}
  <div class="sep"></div>
  <div class="section-title" style="text-transform:none">${escapeHtml(receiptHeading)}</div>
  <table class="lines" role="presentation">${lineRows}</table>
  ${promoRows ? `<div class="sep"></div><div class="section-title">Promociones</div>${promoRows}` : ""}
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
  ${ncPayoutBlock}
  <div class="sep"></div>
  <p class="center muted" style="margin-top:10px;">${
    isNcPayout
      ? "Comprobante de devolución de saldo NC"
      : isArCollection
      ? "Comprobante de cobro"
      : isBackorder
        ? "Comprobante de abono de encargo"
        : data.collectionPending
          ? "Venta registrada — cobro pendiente"
          : "Gracias por su compra"
  }</p>
  <div class="sep"></div>
  <div class="barcode-section"><div class="barcode-wrap">${receiptBarcodeSvgString(data.folio)}</div></div>
</div>
</body></html>`;
}

export function printPosSaleReceipt(data: PosSaleReceiptData, format?: PrintFormat): void {
  if (typeof window === "undefined") return;
  const kind = data.documentKind === "backorder" ? "backorder" : "sale";
  const resolved = format ?? getPosDocumentPrintFormat(kind);
  const folio = data.folio.trim() || "ticket";
  printPosSaleTicketAgentOrBrowserFireAndForget(data, {
    filename: `${folio}.escpos`,
    documentType: data.documentKind === "backorder" ? "BACKORDER" : "SALE",
    internalFolio: folio,
    format: resolved,
  });
}

type DialogProps = {
  open: boolean;
  data: PosSaleReceiptData | null;
  onClose: () => void;
};

function resolveSalePrintFormat(data: PosSaleReceiptData): PrintFormat {
  const kind = data.documentKind === "backorder" ? "backorder" : "sale";
  return getPosDocumentPrintFormat(kind);
}

function printSaleByFormat(data: PosSaleReceiptData, format: PrintFormat) {
  if (isDocumentPrintFormat(format)) {
    printPosSaleDocument(data, format);
  } else {
    printPosSaleReceipt(data, format);
  }
}

async function autoPrintSaleByFormat(data: PosSaleReceiptData, format: PrintFormat): Promise<void> {
  const folio = data.folio.trim() || "ticket";
  if (isDocumentPrintFormat(format)) {
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

export function PosSaleReceiptDialog({ open, data, onClose }: DialogProps) {
  const autoPrintForFolioRef = useRef<string | null>(null);
  const receiptDataRef = useRef(data);
  receiptDataRef.current = data;
  const [printFormat, setPrintFormat] = useState<PrintFormat>("ticket_80mm");
  const [autoPrintStatus, setAutoPrintStatus] = useState<string | null>(null);

  useEffect(() => {
    if (data) {
      setPrintFormat(resolveSalePrintFormat(data));
    }
  }, [data?.folio, data?.documentKind]);

  useEffect(() => {
    if (!open) {
      setAutoPrintStatus(null);
    }
  }, [open]);

  const isDocument = isDocumentPrintFormat(printFormat);

  const previewSrcDoc = useMemo(() => {
    if (!data || typeof window === "undefined") return null;
    return isDocument
      ? buildPosSaleDocumentHtml(data, printFormat)
      : buildPosSaleReceiptHtml(data, window.location.origin, printFormat);
  }, [data, isDocument, printFormat]);

  useEffect(() => {
    if (!open || !data) {
      if (!open) autoPrintForFolioRef.current = null;
      return;
    }
    const folio = data.folio.trim();
    if (!folio || autoPrintForFolioRef.current === folio) return;
    autoPrintForFolioRef.current = folio;
    const format = resolveSalePrintFormat(data);
    const t = window.setTimeout(() => {
      void (async () => {
        const run = async () => {
          const snapshot = receiptDataRef.current;
          if (!snapshot) throw new Error("print_failed");
          await autoPrintSaleByFormat(snapshot, format);
        };
        try {
          await run();
          setAutoPrintStatus(null);
        } catch (firstErr) {
          if (!shouldRetryAutoPrint(firstErr)) {
            const raw = firstErr instanceof Error ? firstErr.message : "print_failed";
            setAutoPrintStatus(
              `No se pudo enviar el ticket al agente. ${formatPrintJobFailedMessage(raw)} Usá «Imprimir de nuevo».`,
            );
            return;
          }
          await new Promise((resolve) => window.setTimeout(resolve, 900));
          try {
            await run();
            setAutoPrintStatus(null);
          } catch (secondErr) {
            const raw =
              secondErr instanceof Error
                ? secondErr.message
                : firstErr instanceof Error
                  ? firstErr.message
                  : "print_failed";
            setAutoPrintStatus(
              `No se pudo enviar el ticket al agente. ${formatPrintJobFailedMessage(raw)} Usá «Imprimir de nuevo».`,
            );
          }
        }
      })();
    }, 1200);
    return () => clearTimeout(t);
  }, [open, data?.folio]);

  if (!data) return null;

  const dialogTitle = data.ncPayout?.length
    ? "Devolución registrada"
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
      data-test-id="pos-payment-success-dialog"
      actions={
        <>
          <Button type="button" variant="outlined" onClick={() => printSaleByFormat(data, printFormat)}>
            Imprimir de nuevo
          </Button>
          <Button type="button" variant="primary" onClick={onClose}>
            Volver al POS
          </Button>
        </>
      }
    >
      <div className="grid gap-2 text-sm">
        <p className="mb-2 text-xs text-muted-foreground">
          Formato:{" "}
          <span className="font-medium text-foreground">{describePrintFormat(printFormat)}</span>
        </p>
        <PrintFormatSelector
          value={printFormat}
          onChange={setPrintFormat}
          data-test-id="pos-sale-receipt-print-format"
        />
        {autoPrintStatus ? (
          <p className="text-sm text-destructive" data-test-id="pos-sale-auto-print-error">
            {autoPrintStatus}
          </p>
        ) : null}
        <div
          className={`mx-auto mt-3 max-h-[min(55vh,520px)] w-full overflow-auto rounded-lg border border-border bg-transparent p-2 ${
            isDocument ? "max-w-[min(100%,720px)]" : "max-w-[min(100%,420px)]"
          }`}
          data-test-id="pos-sale-receipt-preview-wrap"
        >
          {previewSrcDoc ? (
            <iframe
              title={isDocument ? "Vista previa documento" : "Vista previa ticket"}
              srcDoc={previewSrcDoc}
              className={`mx-auto block border-0 bg-white ${
                isDocument
                  ? "min-h-[480px] w-full max-w-[210mm]"
                  : `min-h-[320px] w-[${thermalPreviewWidthCss(printFormat)}] max-w-full`
              }`}
              style={isDocument ? undefined : { width: thermalPreviewWidthCss(printFormat) }}
              data-test-id="pos-sale-receipt-preview-iframe"
            />
          ) : (
            <p className="p-4 text-center text-sm text-muted-foreground">Preparando vista previa…</p>
          )}
        </div>
      </div>
    </Dialog>
  );
}
