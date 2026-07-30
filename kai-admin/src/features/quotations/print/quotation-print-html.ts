import {
  buildCompanyInlineParts,
  DOCUMENT_HEADER_PRINT_CSS,
  formatCompanyAddressForPrint,
  resolveCompanyPhone,
} from "@kai/document-print";
import type { CompanyDetails } from "@/features/settings-branches/infrastructure/company.request";
import { thermalReceiptTicketCss } from "@/features/print/lib/thermal-receipt-ticket-styles";
import { receiptBarcodeSvgString } from "@/lib/receipt-barcode";
import type { QuotationDetail, QuotationLineRow } from "../types/quotation.types";

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
    return new Date(iso).toLocaleString("es-CL", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function formatDateSlash(value: string): string {
  const s = String(value || "").trim();
  const isoDate = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) {
    const [, y, m, d] = isoDate;
    return `${d}/${m}/${y}`;
  }
  const dt = new Date(s);
  if (Number.isNaN(dt.getTime())) return s;
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${dt.getFullYear()}`;
}

function resolveReceiptLogoUrl(companyLogoUrl: string | null | undefined, origin: string): string {
  const appDefault = `${origin}/logo.png`;
  const raw = companyLogoUrl?.trim();
  if (!raw) return appDefault;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("/")) return `${origin}${raw}`;
  return raw;
}

function appliedTaxNamesFromLines(lines: QuotationLineRow[]): string[] {
  const rates = new Set<number>();
  for (const l of lines) {
    if (Number(l.taxRate) > 0) rates.add(Number(l.taxRate));
  }
  return [...rates].sort((a, b) => a - b).map((r) => `IVA ${r}%`);
}

export type QuotationPrintInput = {
  quotation: QuotationDetail;
  company: CompanyDetails | null;
  branchName?: string | null;
  pointOfSaleName?: string | null;
};

export function buildQuotationReceiptHtml(
  input: QuotationPrintInput,
  origin: string,
): string {
  const q = input.quotation;
  const c = input.company;
  const logo = resolveReceiptLogoUrl(null, origin);
  const displayName = c?.nombreFantasia?.trim() || c?.razonSocial?.trim() || "Empresa";
  const folio = q.documentNumber?.trim() || q.id;

  const lineRows = (q.lines ?? [])
    .map((l) => {
      const qty = Number(l.quantity) || 0;
      const unitWithTax = qty > 0 ? (Number(l.total) || 0) / qty : Number(l.unitPrice) || 0;
      const nameBits = [l.productName, l.variantName?.trim() || ""].filter(Boolean);
      const name = nameBits.join(" · ");
      const sku = l.productSku?.trim()
        ? `<div class="muted">${escapeHtml(l.productSku.trim())}</div>`
        : "";
      return `<tr>
        <td class="name">${escapeHtml(name)}${sku}
          <div class="muted">${l.quantity} × ${formatMoney(unitWithTax)}</div>
        </td>
        <td class="tright qty">${formatMoney(l.total)}</td>
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
<style>${thermalReceiptTicketCss()}</style></head><body>
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
  <div class="barcode-wrap">${barcode}</div>
</div>
</body></html>`;
}

export function buildQuotationDocumentHtml(input: QuotationPrintInput): string {
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
    phone: resolveCompanyPhone(c),
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
        <td class="numl">${qty}</td>
        <td class="numl">${formatMoney(price)}</td>
        <td class="num">${formatMoney(lineTotal)}</td>
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

  const addressHtml = addressLines
    .map((line) => `<p class="companyAddress">${escapeHtml(line)}</p>`)
    .join("");

  const discountRow =
    q.discountAmount > 0.01
      ? `<div class="printTotalsRow"><span>Descuentos</span><span class="num">−${formatMoney(q.discountAmount)}</span></div>`
      : "";

  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/>
<title>Cotización ${escapeHtml(folio)}</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; color: #111827; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; font-size: 11px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { width: 100%; max-width: 190mm; margin: 0 auto; padding: 4mm 0; }
  ${DOCUMENT_HEADER_PRINT_CSS}
  .summaryGrid { display: flex; flex-direction: column; align-items: flex-start; gap: 0.55rem; margin-bottom: 0.9rem; }
  .field { font-size: 11px; color: #111827; text-align: left; }
  .label { font-size: 10px; color: #6b7280; margin: 0 0 0.2rem 0; text-transform: uppercase; letter-spacing: 0.06em; }
  .value { margin: 0; font-size: 11px; line-height: 1.35; font-weight: 700; color: #111827; }
  .muted { color: #6b7280; font-weight: 500; }
  .customerIdentity { display: flex; flex-direction: column; gap: 0.2rem; min-width: 0; font-size: 11px; color: #111827; text-align: left; }
  .table { width: 100%; border-collapse: collapse; font-size: 9.5px; }
  .thead th { text-align: left; padding: 0.3rem 0.45rem; border-bottom: 1px solid rgba(17, 24, 39, 0.22); color: #374151; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; }
  .tbody td { padding: 0.32rem 0.45rem; border-bottom: 1px solid rgba(17, 24, 39, 0.12); vertical-align: top; }
  .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .numl { text-align: left; white-space: nowrap; font-variant-numeric: tabular-nums; }
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
          <th class="numl" style="width:10ch">Cant.</th>
          <th class="numl" style="width:14ch">Precio</th>
          <th class="num" style="width:14ch">Total</th>
        </tr>
      </thead>
      <tbody class="tbody">${lineRows}</tbody>
    </table>
    <div class="printTotals" data-test-id="quotation-print-totals">
      <div class="printTotalsRow"><span>Subtotal neto</span><span class="num">${formatMoney(q.subtotal)}</span></div>
      <div class="printTotalsRow"><span>Impuestos${escapeHtml(taxSuffix)}</span><span class="num">${formatMoney(q.taxAmount)}</span></div>
      ${discountRow}
      <div class="printTotalsRow printTotalsTotalRow"><span>Total</span><span class="num">${formatMoney(q.total)}</span></div>
    </div>
    ${notesTrim ? `<div class="printNotesBlock"><p class="printNotesLabel">Notas</p><p class="printNotesBody">${escapeHtml(notesTrim)}</p></div>` : ""}
    ${termsTrim ? `<div class="printNotesBlock"><p class="printNotesLabel">Condiciones</p><p class="printNotesBody">${escapeHtml(termsTrim)}</p></div>` : ""}
    ${barcodeSvg ? `<div class="documentBarcodeFooter"><div class="barcode-wrap">${barcodeSvg}</div></div>` : ""}
  </section>
</div>
</body></html>`;
}
