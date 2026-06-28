import {
  buildCompanyInlineParts,
  DOCUMENT_HEADER_PRINT_CSS,
  formatCompanyAddressForPrint,
} from "@kai/document-print";
import type { CompanyDetails } from "@/features/company/infrastructure/company.request";
import type { QuotationLineRow } from "@/features/quotations/types/quotation.types";
import type { PrintFormat } from "@kai/print-service-client";
import { printPosHtmlViaAgentOrBrowserFireAndForget } from "@/features/pos-print/lib/pos-agent-print";
import {
  documentContentMaxWidth,
  documentPageAtRule,
} from "@/features/pos-print/lib/document-print-format";
import type { QuotationReceiptPrintInput } from "@/features/quotations/lib/quotation-receipt-print";
import { receiptBarcodeSvgString } from "@/lib/receipt-barcode";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatMoneyClp(amount: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatDateSlash(value: string): string {
  const s = String(value || "").trim();
  const isoDate = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) {
    const [, y, m, d] = isoDate;
    return `${d}/${m}/${y}`;
  }
  const dt = new Date(s);
  if (Number.isNaN(dt.getTime())) {
    return s;
  }
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${dt.getFullYear()}`;
}

function appliedTaxNamesFromLines(lines: QuotationLineRow[]): string[] {
  const rates = new Set<number>();
  for (const l of lines) {
    if (Number(l.taxRate) > 0) rates.add(Number(l.taxRate));
  }
  return [...rates].sort((a, b) => a - b).map((r) => `IVA ${r}%`);
}

/**
 * Documento tipo hoja (A4), mismo criterio visual que los documentos imprimibles del admin
 * (`PrintableDocumentLayout` + `PurchaseOrderPrintDocument` / bloques de totales).
 */
export function buildQuotationDocumentHtml(
  input: QuotationReceiptPrintInput,
  format: PrintFormat = "document_a4",
): string {
  const q = input.quotation;
  const c = input.company;
  const razonSocial = (c?.razonSocial ?? "").trim();
  const displayName = (c?.nombreFantasia ?? "").trim();
  const addressLines = formatCompanyAddressForPrint(c?.address);
  const folio = q.documentNumber?.trim() || q.id;
  const barcodeSvg = receiptBarcodeSvgString(folio);
  const appliedTaxNames = appliedTaxNamesFromLines(q.lines ?? []);

  const inlineParts = buildCompanyInlineParts({
    rut: c?.rut,
    phone: c?.phone,
    email: c?.mail,
  });

  const hasCustomer = Boolean(q.customerName?.trim() || q.customerDocument?.trim());
  const hasBranch = Boolean(input.branchName?.trim() || input.pointOfSaleName?.trim());
  const originLabel = [input.branchName?.trim(), input.pointOfSaleName?.trim()]
    .filter(Boolean)
    .map((x) => escapeHtml(String(x)))
    .join(" · ");

  const customerInner = hasCustomer
    ? `<div class="customerIdentity">
         <p class="label">Cliente</p>
         ${q.customerName?.trim() ? `<p class="value">${escapeHtml(q.customerName.trim())}</p>` : ""}
         ${q.customerDocument?.trim() ? `<p class="muted">${escapeHtml(q.customerDocument.trim())}</p>` : ""}
       </div>`
    : "";

  const branchInner = hasBranch
    ? `<div class="field">
         <p class="label">Origen</p>
         <p class="value">${originLabel || "—"}</p>
       </div>`
    : "";

  const summarySection =
    hasCustomer || hasBranch
      ? `<div class="summaryGrid"><div>${customerInner}</div><div>${branchInner}</div></div>`
      : "";

  const lineRows = (q.lines ?? [])
    .map((l, idx) => {
      const qty = Number(l.quantity) || 0;
      const price = Number(l.unitPrice) || 0;
      const lineTotal = Math.round(qty * price);
      const sku = l.productSku?.trim() ? escapeHtml(l.productSku.trim()) : "—";
      const variant = l.variantName?.trim() ? ` · ${escapeHtml(l.variantName.trim())}` : "";
      return `<tr>
        <td class="muted">${idx + 1}</td>
        <td><span>${escapeHtml(l.productName)}</span>${variant}</td>
        <td class="muted">${sku}</td>
        <td class="num">${qty}</td>
        <td class="num">${formatMoneyClp(price)}</td>
        <td class="num">${formatMoneyClp(lineTotal)}</td>
      </tr>`;
    })
    .join("");

  const taxSuffix = appliedTaxNames.length > 0 ? ` (${appliedTaxNames.join(", ")})` : "";
  const notesTrim = q.notes != null ? String(q.notes).trim() : "";
  const termsTrim = q.terms != null ? String(q.terms).trim() : "";

  const companyHeaderLeft = displayName
    ? `<p class="companyKicker">${escapeHtml(razonSocial || "—")}</p>
       <h1 class="companyName">${escapeHtml(displayName)}</h1>`
    : `<h1 class="companyName">${escapeHtml(razonSocial || "—")}</h1>`;

  const addressHtml = addressLines.map((line) => `<p class="companyAddress">${escapeHtml(line)}</p>`).join("");

  const discountRow =
    q.discountAmount > 0.01
      ? `<div class="printTotalsRow"><span>Descuentos</span><span class="num">−${formatMoneyClp(q.discountAmount)}</span></div>`
      : "";

  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/>
<title>Cotización ${escapeHtml(folio)}</title>
<style>
  ${documentPageAtRule(format)}
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 0;
    color: #111827;
    font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji";
    font-size: 11px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .page { width: 100%; max-width: ${documentContentMaxWidth(format)}; margin: 0 auto; padding: 4mm 0; }
  ${DOCUMENT_HEADER_PRINT_CSS}
  .summaryGrid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem 1.25rem; margin-bottom: 0.9rem; }
  .field { font-size: 11px; color: #111827; }
  .label { font-size: 10px; color: #6b7280; margin: 0 0 0.2rem 0; text-transform: uppercase; letter-spacing: 0.06em; }
  .value { margin: 0; font-size: 11px; line-height: 1.35; font-weight: 700; color: #111827; }
  .muted { color: #6b7280; font-weight: 500; }
  .customerIdentity { display: flex; flex-direction: column; gap: 0.2rem; min-width: 0; font-size: 11px; color: #111827; }
  .table { width: 100%; border-collapse: collapse; font-size: 9.5px; }
  .thead th { text-align: left; padding: 0.3rem 0.45rem; border-bottom: 1px solid rgba(17, 24, 39, 0.22); color: #374151; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; }
  .tbody td { padding: 0.32rem 0.45rem; border-bottom: 1px solid rgba(17, 24, 39, 0.12); vertical-align: top; }
  .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .printTotals { margin-top: 0.85rem; border: 1px solid rgba(17, 24, 39, 0.18); border-radius: 6px; padding: 0.32rem 0.5rem; font-size: 9px; color: #111827; }
  .printTotalsRow { display: flex; justify-content: space-between; align-items: baseline; gap: 0.75rem; padding: 0.12rem 0; }
  .printTotalsTotalRow { margin-top: 0.1rem; padding-top: 0.22rem; border-top: 1px solid rgba(17, 24, 39, 0.16); font-weight: 800; }
  .printNotesBlock { margin-top: 0.5rem; font-size: 9px; }
  .printNotesLabel { color: #6b7280; text-transform: uppercase; letter-spacing: 0.06em; font-size: 9px; margin: 0 0 0.2rem 0; }
  .printNotesBody { margin: 0; color: #111827; white-space: pre-wrap; line-height: 1.35; }
  .documentBarcodeFooter { margin-top: 1rem; display: flex; justify-content: flex-end; width: 100%; }
  .documentBarcodeFooter .barcode-wrap { display: flex; flex-direction: column; align-items: flex-end; }
  .documentBarcodeFooter .barcode-wrap svg { max-width: 55mm; height: auto; }
</style></head><body>
<div class="page" data-test-id="quotation-print-document">
  <header class="companyHeader">
    <div>
      ${companyHeaderLeft}
      ${addressHtml}
      ${inlineParts.length > 0 ? `<p class="companyInline">${escapeHtml(inlineParts.join(" · "))}</p>` : ""}
    </div>
    <div class="documentMeta">
      <h2 class="documentTitle">COTIZACIÓN</h2>
      <p class="documentDate">Fecha: ${escapeHtml(formatDateSlash(q.issuedAt))}</p>
      <p class="documentFolio">Folio ${escapeHtml(folio)}</p>
      <p class="documentDate" style="margin-top:0.35rem">Válida hasta: ${escapeHtml(formatDateSlash(q.validUntil))}</p>
      <p class="documentDate" style="margin-top:0.15rem;font-weight:500">Vigencia: ${q.validityDays} día(s)</p>
    </div>
  </header>
  <div class="separator" aria-hidden="true"></div>
  <section>
    ${summarySection}
    <table class="table" data-test-id="quotation-print-lines">
      <thead class="thead">
        <tr>
          <th style="width:4ch">#</th>
          <th>Producto</th>
          <th style="width:18ch">SKU</th>
          <th class="num" style="width:10ch">Cant.</th>
          <th class="num" style="width:14ch">Precio</th>
          <th class="num" style="width:14ch">Total</th>
        </tr>
      </thead>
      <tbody class="tbody">${lineRows}</tbody>
    </table>
    <div class="printTotals" data-test-id="quotation-print-totals">
      <div class="printTotalsRow"><span>Subtotal neto</span><span class="num">${formatMoneyClp(q.subtotal)}</span></div>
      <div class="printTotalsRow"><span>Impuestos${escapeHtml(taxSuffix)}</span><span class="num">${formatMoneyClp(q.taxAmount)}</span></div>
      ${discountRow}
      <div class="printTotalsRow printTotalsTotalRow"><span>Total</span><span class="num">${formatMoneyClp(q.total)}</span></div>
    </div>
    ${notesTrim ? `<div class="printNotesBlock" data-test-id="quotation-print-notes"><p class="printNotesLabel">Notas</p><p class="printNotesBody">${escapeHtml(notesTrim)}</p></div>` : ""}
    ${termsTrim ? `<div class="printNotesBlock" data-test-id="quotation-print-terms"><p class="printNotesLabel">Condiciones</p><p class="printNotesBody">${escapeHtml(termsTrim)}</p></div>` : ""}
    ${
      barcodeSvg
        ? `<div class="documentBarcodeFooter" data-test-id="quotation-print-barcode"><div class="barcode-wrap">${barcodeSvg}</div></div>`
        : ""
    }
  </section>
</div>
</body></html>`;
}

export function printPosQuotationDocument(
  input: QuotationReceiptPrintInput,
  format?: PrintFormat,
): void {
  if (typeof window === "undefined") return;
  const resolved = format ?? "document_a4";
  const html = buildQuotationDocumentHtml(input, resolved);
  const folio = input.quotation.documentNumber?.trim() || "cotizacion";
  printPosHtmlViaAgentOrBrowserFireAndForget(html, "documents", {
    filename: `${folio}.pdf`,
    iframeTitle: "Impresión cotización documento",
    documentType: "QUOTATION",
    internalFolio: folio,
    format: resolved,
  });
}
