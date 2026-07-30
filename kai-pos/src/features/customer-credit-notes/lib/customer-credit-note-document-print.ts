import {
  buildCompanyInlineParts,
  formatCompanyAddressForPrint,
} from "@kai/document-print";
import type { PrintFormat } from "@kai/print-service-client";
import type { CustomerCreditNotePrintData } from "../types/customer-credit-note-print.types";
import { printPosHtmlViaAgentOrBrowserFireAndForget } from "@/features/pos-print/lib/pos-agent-print";
import {
  documentContentMaxWidth,
  documentPageAtRule,
} from "@/features/pos-print/lib/document-print-format";
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

function formatDateSlash(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("es-CL");
  } catch {
    return iso;
  }
}

export function buildCustomerCreditNoteDocumentHtml(
  data: CustomerCreditNotePrintData,
  format: PrintFormat = "document_a4",
): string {
  const c = data.company;
  const displayName = c.nombreFantasia?.trim() || c.razonSocial;
  const addressLines = formatCompanyAddressForPrint(c.address);
  const inlineParts = buildCompanyInlineParts({
    rut: c.rut,
    phone: c.phone,
    email: c.mail,
  });
  const folio = data.creditNoteFolio;
  const barcodeSvg = receiptBarcodeSvgString(folio);

  const lineRows = data.lines
    .map((l, idx) => {
      const attrs = l.attributes.length > 0 ? ` · ${escapeHtml(l.attributes.join(" · "))}` : "";
      const unit = l.unitSymbol?.trim() ? ` ${escapeHtml(l.unitSymbol.trim())}` : "";
      return `<tr>
        <td class="muted">${idx + 1}</td>
        <td><span>${escapeHtml(l.productName)}</span>${attrs}</td>
        <td class="numl">${l.quantity}${unit}</td>
        <td class="numl">${formatMoneyClp(l.unitPriceWithTax)}</td>
        <td class="num">${formatMoneyClp(l.lineGross - l.discountAmount)}</td>
      </tr>`;
    })
    .join("");

  const cust = data.customer;
  const customerInner =
    cust?.name?.trim() || cust?.document?.trim()
      ? `<div class="customerIdentity">
           <p class="label">Cliente</p>
           ${cust.name?.trim() ? `<p class="value">${escapeHtml(cust.name.trim())}</p>` : ""}
           ${cust.document?.trim() ? `<p class="muted">${escapeHtml(cust.document.trim())}</p>` : ""}
         </div>`
      : "";

  const originLabel = [data.pos.branchName, data.pos.pointOfSaleName].filter(Boolean).join(" · ");

  const refundBlock =
    data.refundMode === "immediate" && data.refundPayments.length > 0
      ? `<div class="printTotals" style="margin-top:0.75rem;max-width:100%">
           <p class="label">Reembolso en caja</p>
           ${data.refundPayments
             .map(
               (p) =>
                 `<div class="printTotalsRow"><span>${escapeHtml(p.label)}</span><span>${formatMoneyClp(p.amount)}</span></div>`,
             )
             .join("")}
           <p class="muted" style="margin-top:0.35rem">Dinero entregado al cliente desde esta sesión de caja.</p>
         </div>`
      : "";

  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/>
<title>Nota de crédito ${escapeHtml(folio)}</title>
<style>
  ${documentPageAtRule(format)}
  * { box-sizing: border-box; }
  body { margin: 0; font-family: system-ui, sans-serif; font-size: 11px; color: #111827; }
  .page { max-width: ${documentContentMaxWidth(format)}; margin: 0 auto; }
  .companyHeader { display: flex; justify-content: space-between; gap: 1rem; }
  .companyName { margin: 0; font-size: 20px; font-weight: 800; }
  .documentTitle { margin: 0; font-size: 22px; font-weight: 900; color: #1e3a8a; text-align: right; }
  .separator { margin: 1rem 0; height: 1px; background: rgba(17,24,39,0.2); }
  .summaryGrid { display: flex; flex-direction: column; align-items: flex-start; gap: 0.75rem; }
  .summaryGrid > div { text-align: left; }
  .label { font-size: 10px; color: #6b7280; text-transform: uppercase; margin: 0 0 0.2rem; }
  .value { margin: 0; font-weight: 700; }
  .muted { color: #6b7280; }
  .table { width: 100%; border-collapse: collapse; font-size: 10px; }
  .table th { text-align: left; border-bottom: 1px solid #d1d5db; padding: 0.35rem; font-size: 9px; text-transform: uppercase; }
  .table td { padding: 0.35rem; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
  .num { text-align: right; white-space: nowrap; }
  .numl { text-align: left; white-space: nowrap; }
  .printTotals { margin-top: 1rem; border: 1px solid #d1d5db; border-radius: 6px; padding: 0.5rem; max-width: 280px; margin-left: auto; }
  .printTotalsRow { display: flex; justify-content: space-between; padding: 0.15rem 0; }
  .printTotalsTotalRow { font-weight: 800; border-top: 1px solid #d1d5db; margin-top: 0.25rem; padding-top: 0.35rem; }
  .barcode { text-align: right; margin-top: 0.5rem; }
</style></head><body>
<div class="page">
  <div class="companyHeader">
    <div>
      <h1 class="companyName">${escapeHtml(displayName)}</h1>
      ${addressLines.map((l) => `<p class="muted">${escapeHtml(l)}</p>`).join("")}
      ${inlineParts.length > 0 ? `<p class="muted">${escapeHtml(inlineParts.join(" · "))}</p>` : ""}
    </div>
    <div>
      <p class="documentTitle">NOTA DE CRÉDITO</p>
      <p class="value" style="text-align:right">Folio ${escapeHtml(folio)}</p>
      <p class="muted" style="text-align:right">${escapeHtml(formatDateSlash(data.issuedAtIso))}</p>
      <div class="barcode">${barcodeSvg}</div>
    </div>
  </div>
  <div class="separator"></div>
  <div class="summaryGrid">
    <div>${customerInner}</div>
    <div>
      <p class="label">Referencias</p>
      <p class="value">Venta: ${escapeHtml(data.originalSaleFolio)}</p>
      <p class="value">Devolución: ${escapeHtml(data.saleReturnFolio)}</p>
      ${originLabel ? `<p class="muted">${escapeHtml(originLabel)}</p>` : ""}
    </div>
  </div>
  <div class="separator"></div>
  <table class="table">
    <thead><tr>
      <th>#</th><th>Producto</th><th class="numl">Cant.</th><th class="numl">P. unit.</th><th class="num">Total</th>
    </tr></thead>
    <tbody>${lineRows}</tbody>
  </table>
  <div class="printTotals">
    <div class="printTotalsRow"><span>Subtotal neto</span><span>${formatMoneyClp(data.totals.subtotalNet)}</span></div>
    <div class="printTotalsRow"><span>Impuestos</span><span>${formatMoneyClp(data.totals.taxes)}</span></div>
    <div class="printTotalsRow"><span>Descuentos</span><span>${formatMoneyClp(data.totals.discounts)}</span></div>
    <div class="printTotalsRow printTotalsTotalRow"><span>Monto NC</span><span>${formatMoneyClp(data.totals.total)}</span></div>
  </div>
  ${refundBlock}
</div>
</body></html>`;
}

export function printCustomerCreditNoteDocument(
  data: CustomerCreditNotePrintData,
  format?: PrintFormat,
): void {
  const resolved = format ?? "document_a4";
  const html = buildCustomerCreditNoteDocumentHtml(data, resolved);
  const folio = data.creditNoteFolio?.trim() || "nota-credito";
  printPosHtmlViaAgentOrBrowserFireAndForget(html, "documents", {
    filename: `${folio}.pdf`,
    iframeTitle: "Impresión nota de crédito documento",
    documentType: "CUSTOMER_CREDIT_NOTE",
    internalFolio: folio,
    format: resolved,
  });
}
