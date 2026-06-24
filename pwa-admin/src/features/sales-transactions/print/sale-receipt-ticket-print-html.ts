import { thermalReceiptCssForFormat } from "@/features/print/lib/thermal-receipt-ticket-styles";
import { receiptBarcodeSvgString } from "@/lib/receipt-barcode";
import type { PrintFormat } from "@flowstore/print-service-client";
import type { SaleReceiptPrintData } from "./backorder-document-print.types";
import { formatReceiptLineDisplayName } from "./format-receipt-line-name";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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

function resolveReceiptLogoUrl(logoUrl: string | null | undefined, origin: string): string {
  const appDefault = `${origin}/logo.png`;
  const raw = logoUrl?.trim();
  if (!raw) return appDefault;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("/")) return `${origin}${raw}`;
  return raw;
}

/** Ticket térmico (fallback navegador en admin). */
export function buildSaleReceiptTicketHtml(
  data: SaleReceiptPrintData,
  origin: string,
  format: PrintFormat = "ticket_80mm",
): string {
  const isBackorder = data.documentKind === "backorder";
  const logo = resolveReceiptLogoUrl(data.company.logoUrl, origin);
  const displayName = data.company.nombreFantasia?.trim() || data.company.razonSocial.trim();
  const receiptHeading = isBackorder ? "ENCARGO" : "Detalle de Venta";

  const lineRows = data.lines
    .map((l) => {
      const name = formatReceiptLineDisplayName(l.productName, l.attributes);
      const qtyLine = `${l.quantity} × ${formatMoney(l.unitPriceWithTax)}`;
      return `<tr>
        <td class="name">${escapeHtml(name)}<div class="muted">${escapeHtml(qtyLine)}</div></td>
        <td class="tright qty">${formatMoney(l.lineGross)}</td>
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
      const det = p.detail
        ? `<div class="muted" style="margin-top:2px;">${escapeHtml(p.detail)}</div>`
        : "";
      return `<div class="row"><span>${escapeHtml(p.label)}</span><span>${formatMoney(p.amount)}</span></div>${det}`;
    })
    .join("");

  const bo = data.backorder;
  const backorderHeaderLine =
    isBackorder && bo
      ? `<p class="center muted">Abono: ${formatMoney(bo.depositAmount)}${bo.percent > 0 ? ` · ${bo.percent}%` : ""}</p>`
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
    cust && (cust.name?.trim() || cust.document?.trim())
      ? `<div class="sep"></div>
         <div class="section-title">Cliente</div>
         ${cust.name?.trim() ? `<div class="row"><span>Nombre</span><span class="tright">${escapeHtml(cust.name.trim())}</span></div>` : ""}
         ${cust.document?.trim() ? `<div class="row"><span>Documento</span><span>${escapeHtml(cust.document.trim())}</span></div>` : ""}`
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
  ${backorderHeaderLine}
  ${custBlock}
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
  <div class="sep"></div>
  <p class="center muted" style="margin-top:10px;">${isBackorder ? "Comprobante de abono de encargo" : "Gracias por su compra"}</p>
  <div class="sep"></div>
  <div class="barcode-wrap">${receiptBarcodeSvgString(data.folio)}</div>
</div>
</body></html>`;
}
