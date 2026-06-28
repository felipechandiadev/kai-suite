import {
  buildCompanyInlineParts,
  DOCUMENT_HEADER_PRINT_CSS,
  formatCompanyAddressForPrint,
  resolveCompanyPhone,
} from "@kai/document-print";
import { receiptBarcodeSvgString } from "@/lib/receipt-barcode";
import type { PaymentInPrintData } from "./payment-in-print.types";

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

function formatDateSlash(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${dd}/${mm}/${d.getFullYear()}`;
  } catch {
    return iso;
  }
}

/** Documento A4 de comprobante de cobro (hoja). */
export function buildPaymentInDocumentHtml(data: PaymentInPrintData): string {
  const folio = data.folio.trim() || "—";
  const razonSocial = data.company.razonSocial.trim();
  const displayName = data.company.nombreFantasia?.trim() || razonSocial;
  const addressLines = formatCompanyAddressForPrint(data.company.address);
  const inlineParts = buildCompanyInlineParts({
    rut: data.company.rut,
    phone: data.company.phone ?? resolveCompanyPhone(data.company),
    mail: data.company.mail,
    businessActivity: data.company.businessActivity,
  });
  const barcodeSvg = receiptBarcodeSvgString(folio);

  const paymentRows = data.payments
    .map(
      (p, idx) => `<tr>
        <td class="muted">${idx + 1}</td>
        <td>${escapeHtml(p.label)}${p.detail ? `<div class="muted">${escapeHtml(p.detail)}</div>` : ""}</td>
        <td class="num">${formatMoney(p.amount)}</td>
      </tr>`,
    )
    .join("");

  const allocationRows = data.allocations
    .map(
      (a, idx) => `<tr>
        <td class="muted">${idx + 1}</td>
        <td class="mono">${escapeHtml(a.documentNumber)}</td>
        <td class="num">${formatMoney(a.amount)}</td>
      </tr>`,
    )
    .join("");

  const customerInner = data.customer
    ? `<p class="label">Cliente</p>
       <p class="value">${escapeHtml(data.customer.name)}</p>
       ${data.customer.document ? `<p class="muted">${escapeHtml(data.customer.document)}</p>` : ""}`
    : `<p class="label">Cliente</p><p class="value muted">—</p>`;

  const branchInner = `<p class="label">Origen</p>
    <p class="value">${escapeHtml([data.branchName, data.pointOfSaleName].filter(Boolean).join(" · ") || "—")}</p>
    ${data.operatorName ? `<p class="muted">Registrado por: ${escapeHtml(data.operatorName)}</p>` : ""}`;

  const companyHeaderLeft = displayName
    ? `<p class="companyKicker">${escapeHtml(razonSocial || "—")}</p>
       <h1 class="companyName">${escapeHtml(displayName)}</h1>`
    : `<h1 class="companyName">${escapeHtml(razonSocial || "—")}</h1>`;

  const addressHtml = addressLines
    .map((line) => `<p class="companyAddress">${escapeHtml(line)}</p>`)
    .join("");

  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/>
<title>Comprobante de cobro ${escapeHtml(folio)}</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; color: #111827; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; font-size: 11px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { width: 100%; max-width: 190mm; margin: 0 auto; padding: 4mm 0; }
  ${DOCUMENT_HEADER_PRINT_CSS}
  .summaryGrid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem 1.25rem; margin-bottom: 0.9rem; }
  .field { font-size: 11px; color: #111827; }
  .label { font-size: 10px; color: #6b7280; margin: 0 0 0.2rem 0; text-transform: uppercase; letter-spacing: 0.06em; }
  .value { margin: 0; font-size: 11px; line-height: 1.35; font-weight: 700; color: #111827; }
  .muted { color: #6b7280; font-weight: 500; }
  .mono { font-family: ui-monospace, monospace; }
  .table { width: 100%; border-collapse: collapse; font-size: 9.5px; margin-top: 0.5rem; }
  .thead th { text-align: left; padding: 0.3rem 0.45rem; border-bottom: 1px solid rgba(17, 24, 39, 0.22); color: #374151; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; }
  .tbody td { padding: 0.32rem 0.45rem; border-bottom: 1px solid rgba(17, 24, 39, 0.12); vertical-align: top; }
  .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .printTotals { margin-top: 0.85rem; border: 1px solid rgba(17, 24, 39, 0.18); border-radius: 6px; padding: 0.32rem 0.5rem; font-size: 9px; }
  .printTotalsRow { display: flex; justify-content: space-between; align-items: baseline; gap: 0.75rem; padding: 0.12rem 0; }
  .printTotalsTotalRow { margin-top: 0.1rem; padding-top: 0.22rem; border-top: 1px solid rgba(17, 24, 39, 0.16); font-weight: 800; }
  .sectionTitle { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: #374151; margin: 1rem 0 0.35rem; }
  .printNotesBlock { margin-top: 0.5rem; font-size: 9px; }
  .documentBarcodeFooter { margin-top: 1rem; display: flex; justify-content: flex-end; width: 100%; }
  .documentBarcodeFooter .barcode-wrap svg { max-width: 55mm; height: auto; }
</style></head><body>
<div class="page" data-test-id="payment-in-print-document">
  <header class="companyHeader">
    <div>
      ${companyHeaderLeft}
      ${addressHtml}
      ${inlineParts.length > 0 ? `<p class="companyInline">${escapeHtml(inlineParts.join(" · "))}</p>` : ""}
    </div>
    <div class="documentMeta">
      <h2 class="documentTitle">COMPROBANTE DE COBRO</h2>
      <p class="documentDate">Fecha: ${escapeHtml(formatDateSlash(data.issuedAtIso))}</p>
      <p class="documentFolio">Folio ${escapeHtml(folio)}</p>
    </div>
  </header>
  <div class="separator" aria-hidden="true"></div>
  <div class="summaryGrid">
    <div>${customerInner}</div>
    <div>${branchInner}</div>
  </div>
  <p class="sectionTitle">Medios de pago recibidos</p>
  <table class="table">
    <thead class="thead"><tr><th style="width:4ch">#</th><th>Medio</th><th class="num" style="width:14ch">Monto</th></tr></thead>
    <tbody class="tbody">${paymentRows || '<tr><td colspan="3" class="muted">—</td></tr>'}</tbody>
  </table>
  ${
    data.allocations.length > 0
      ? `<p class="sectionTitle">Aplicación a ventas</p>
  <table class="table">
    <thead class="thead"><tr><th style="width:4ch">#</th><th>Venta</th><th class="num" style="width:14ch">Monto</th></tr></thead>
    <tbody class="tbody">${allocationRows}</tbody>
  </table>`
      : ""
  }
  <div class="printTotals">
    <div class="printTotalsRow printTotalsTotalRow"><span>Total cobrado</span><span class="num">${formatMoney(data.totalCollected)}</span></div>
    <div class="printTotalsRow"><span>Registrado pagado</span><span class="num">${formatMoney(data.amountPaid)}</span></div>
  </div>
  ${data.externalReference ? `<div class="printNotesBlock"><span class="label">Referencia externa</span><p class="value mono">${escapeHtml(data.externalReference)}</p></div>` : ""}
  ${data.notes ? `<div class="printNotesBlock"><span class="label">Notas</span><p class="value">${escapeHtml(data.notes)}</p></div>` : ""}
  ${barcodeSvg ? `<div class="documentBarcodeFooter"><div class="barcode-wrap">${barcodeSvg}</div></div>` : ""}
</div>
</body></html>`;
}
