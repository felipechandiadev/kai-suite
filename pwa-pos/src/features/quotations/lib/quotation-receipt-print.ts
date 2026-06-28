import type { CompanyDetails } from "@/features/company/infrastructure/company.request";
import type { QuotationDetail } from "@/features/quotations/types/quotation.types";
import type { PrintFormat } from "@kai/print-service-client";
import { printPosQuotationReceiptAgentOrBrowserFireAndForget } from "@/features/quotations/lib/quotation-ticket-agent";
import { thermalReceiptCssForFormat } from "@/features/pos-print/lib/thermal-receipt-ticket-styles";
import { receiptBarcodeSvgString } from "@/lib/receipt-barcode";

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

function resolveReceiptLogoUrl(companyLogoUrl: string | null | undefined, origin: string): string {
  const appDefault = `${origin}/logo.png`;
  const raw = companyLogoUrl?.trim();
  if (!raw) return appDefault;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("/")) return `${origin}${raw}`;
  return raw;
}

export type QuotationReceiptPrintInput = {
  quotation: QuotationDetail;
  company: CompanyDetails | null;
  branchName?: string | null;
  pointOfSaleName?: string | null;
};

/** Mismo HTML que se envía a la impresora 80 mm (vista previa en diálogo). */
export function buildQuotationReceiptHtml(
  input: QuotationReceiptPrintInput,
  origin: string,
  format: PrintFormat = "ticket_80mm",
): string {
  const q = input.quotation;
  const c = input.company;
  const logo = resolveReceiptLogoUrl(c?.logoUrl, origin);
  const displayName = c?.nombreFantasia?.trim() || c?.razonSocial?.trim() || "Empresa";
  const folio = q.documentNumber?.trim() || q.id;

  const lineRows = (q.lines ?? [])
    .map((l) => {
      const qty = Number(l.quantity) || 0;
      const unitWithTax = qty > 0 ? (Number(l.total) || 0) / qty : Number(l.unitPrice) || 0;
      const nameBits = [l.productName, l.variantName?.trim() || ""].filter(Boolean);
      const name = nameBits.join(" · ");
      const sku = l.productSku?.trim() ? `<div class="muted">${escapeHtml(l.productSku.trim())}</div>` : "";
      return `<tr>
        <td class="line-block">
          <div class="line-name">${escapeHtml(name)}${sku}</div>
          <div class="line-detail">
            <span class="line-qty">${l.quantity} × ${formatMoney(unitWithTax)}</span>
            <span class="line-total">${formatMoney(l.total)}</span>
          </div>
        </td>
      </tr>`;
    })
    .join("");

  const custBlock =
    q.customerName?.trim() || q.customerDocument?.trim()
      ? `<div class="sep"></div>
         <div class="section-title">Cliente</div>
         ${q.customerName?.trim() ? `<div class="row customer-name"><span>Nombre</span><span class="customer-name-value">${escapeHtml(q.customerName.trim())}</span></div>` : ""}
         ${q.customerDocument?.trim() ? `<div class="row"><span>Documento</span><span>${escapeHtml(q.customerDocument.trim())}</span></div>` : ""}`
      : "";

  const notesBlock =
    q.notes?.trim() && q.notes.trim().length > 0
      ? `<div class="sep"></div>
         <div class="section-title">Notas</div>
         <p class="wrap">${escapeHtml(q.notes.trim())}</p>`
      : "";

  const posBlock =
    input.branchName?.trim() || input.pointOfSaleName?.trim()
      ? `<div class="sep"></div>
         ${input.branchName?.trim() ? `<div class="row"><span>Sucursal</span><span class="tright">${escapeHtml(input.branchName.trim())}</span></div>` : ""}
         ${input.pointOfSaleName?.trim() ? `<div class="row"><span>Punto de venta</span><span class="tright">${escapeHtml(input.pointOfSaleName.trim())}</span></div>` : ""}`
      : "";

  const barcode = receiptBarcodeSvgString(folio);

  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/>
<title>Cotización ${escapeHtml(folio)}</title>
<style>${thermalReceiptCssForFormat(format)}</style></head><body>
<div class="receipt">
  <img class="logo" src="${escapeHtml(logo)}" alt="" />
  <p class="store">${escapeHtml(displayName)}</p>
  ${c?.razonSocial && c?.nombreFantasia ? `<p class="legal">${escapeHtml(c.razonSocial)}</p>` : ""}
  ${c?.rut ? `<p class="legal">RUT: ${escapeHtml(c.rut)}</p>` : ""}
  <div class="sep"></div>
  <p class="center" style="font-size:12px;font-weight:600;">COTIZACIÓN</p>
  <p class="center muted">Folio: ${escapeHtml(folio)}</p>
  <p class="center muted">${escapeHtml(formatDateTime(q.issuedAt))}</p>
  <p class="center muted">Válida hasta: ${escapeHtml(formatDateTime(q.validUntil))}</p>
  ${posBlock}
  ${custBlock}
  <div class="sep"></div>
  <div class="section-title" style="text-transform:none">Detalle</div>
  <table class="lines" role="presentation">${lineRows}</table>
  <div class="sep"></div>
  <div class="row"><span>Subtotal</span><span>${formatMoney(q.subtotal)}</span></div>
  <div class="row"><span>Impuestos</span><span>${formatMoney(q.taxAmount)}</span></div>
  ${q.discountAmount > 0.01 ? `<div class="row"><span>Descuentos</span><span>−${formatMoney(q.discountAmount)}</span></div>` : ""}
  <div class="row tot"><span>TOTAL</span><span>${formatMoney(q.total)}</span></div>
  ${notesBlock}
  <div class="sep"></div>
  <div class="barcode-section"><div class="barcode-wrap">${barcode}</div></div>
</div>
</body></html>`;
}

export function printPosQuotationReceipt(
  input: QuotationReceiptPrintInput,
  format?: PrintFormat,
): void {
  printPosQuotationReceiptAgentOrBrowserFireAndForget(input, format);
}
