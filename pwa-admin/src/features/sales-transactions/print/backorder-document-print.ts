import { printAdminHtmlViaAgentOrBrowser } from "@/features/print/lib/admin-agent-document-print";
import {
  documentContentMaxWidth,
  documentPageAtRule,
} from "@/features/print/lib/document-print-format";
import { receiptBarcodeSvgString } from "@/lib/receipt-barcode";
import {
  buildCompanyInlineParts,
  DOCUMENT_HEADER_PRINT_CSS,
  formatCompanyAddressForPrint,
} from "@kai/document-print";
import type { PrintFormat } from "@kai/print-service-client";
import type { SaleReceiptPrintData } from "./backorder-document-print.types";
import { getAdminPrintFormatForData } from "./admin-print-format";
import { formatReceiptLineDisplayName } from "./format-receipt-line-name";

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
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return iso;
    const dd = String(dt.getDate()).padStart(2, "0");
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    return `${dd}/${mm}/${dt.getFullYear()}`;
  } catch {
    return iso;
  }
}

function printHtmlInHiddenIframe(html: string, title: string): void {
  if (typeof window === "undefined") return;
  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", title);
  Object.assign(iframe.style, {
    position: "fixed",
    right: "0",
    bottom: "0",
    width: "0",
    height: "0",
    border: "0",
    opacity: "0",
    pointerEvents: "none",
  });
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();
  const cleanup = () => {
    try {
      iframe.remove();
    } catch {
      /* ignore */
    }
  };
  setTimeout(() => {
    try {
      win.focus();
      win.print();
    } catch {
      /* ignore */
    } finally {
      setTimeout(cleanup, 1200);
    }
  }, 120);
}

/** HTML venta o encargo en hoja (carta / A4). */
export function buildSaleReceiptDocumentHtml(
  data: SaleReceiptPrintData,
  format: PrintFormat = "document_a4",
): string {
  const isBackorder = data.documentKind === "backorder";
  const documentTitle = isBackorder ? "ENCARGO" : "VENTA";
  const folio = data.folio.trim() || "—";
  const barcodeSvg = receiptBarcodeSvgString(folio);
  const c = data.company;
  const razonSocial = (c.razonSocial ?? "").trim();
  const displayName = (c.nombreFantasia ?? "").trim();
  const addressLines = formatCompanyAddressForPrint(c.address);
  const inlineParts = buildCompanyInlineParts({
    rut: c.rut,
    phone: c.phone,
    email: c.mail,
  });

  const cust = data.customer;
  const hasCustomer = Boolean(cust?.name?.trim() || cust?.document?.trim());
  const hasBranch = Boolean(data.pos.branchName?.trim() || data.pos.pointOfSaleName?.trim());
  const originLabel = [data.pos.branchName?.trim(), data.pos.pointOfSaleName?.trim()]
    .filter(Boolean)
    .map((x) => escapeHtml(String(x)))
    .join(" · ");

  const customerInner = hasCustomer
    ? `<div class="customerIdentity">
         <p class="label">Cliente</p>
         ${cust?.name?.trim() ? `<p class="value">${escapeHtml(cust.name.trim())}</p>` : ""}
         ${cust?.document?.trim() ? `<p class="muted">${escapeHtml(cust.document.trim())}</p>` : ""}
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

  const lineRows = data.lines
    .map((l, idx) => {
      const name = formatReceiptLineDisplayName(l.productName, l.attributes);
      const qty = Number(l.quantity) || 0;
      const price = Number(l.unitPriceWithTax) || 0;
      const lineTotal = Math.round(l.lineGross);
      return `<tr>
        <td class="muted">${idx + 1}</td>
        <td>${escapeHtml(name)}</td>
        <td class="numl">${qty}</td>
        <td class="numl">${formatMoneyClp(price)}</td>
        <td class="num">${formatMoneyClp(lineTotal)}</td>
      </tr>`;
    })
    .join("");

  const promoRows =
    data.promotions.length > 0
      ? data.promotions
          .map(
            (p) =>
              `<div class="printTotalsRow"><span>${escapeHtml(p.code)} ${escapeHtml(p.name)}</span><span class="num">−${formatMoneyClp(p.amount)}</span></div>`,
          )
          .join("")
      : "";

  const bo = data.backorder;
  const orderTotal = bo?.orderTotal ?? data.totals.total;
  const depositAmount = bo?.depositAmount ?? data.totals.paid;
  const backorderHeaderLine =
    isBackorder && bo
      ? `<p class="documentDate" style="margin-top:0.35rem;font-weight:600">Abono: ${formatMoneyClp(depositAmount)}${bo.percent > 0 ? ` · ${bo.percent}%` : ""}</p>`
      : "";

  const backorderTotals = isBackorder
    ? `<div class="printTotalsRow"><span>Total del pedido</span><span class="num">${formatMoneyClp(orderTotal)}</span></div>
       <div class="printTotalsRow printTotalsTotalRow"><span>Abono</span><span class="num">${formatMoneyClp(depositAmount)}</span></div>
       <div class="printTotalsRow"><span>Saldo pendiente</span><span class="num">${formatMoneyClp(Math.max(0, orderTotal - depositAmount))}</span></div>`
    : `<div class="printTotalsRow printTotalsTotalRow"><span>Total</span><span class="num">${formatMoneyClp(data.totals.total)}</span></div>`;

  const payRows = data.payments
    .map(
      (p) =>
        `<div class="printTotalsRow"><span>${escapeHtml(p.label)}</span><span class="num">${formatMoneyClp(p.amount)}</span></div>`,
    )
    .join("");

  const changeRow =
    data.totals.change > 0.01
      ? `<div class="printTotalsRow"><span>Vuelto</span><span class="num">${formatMoneyClp(data.totals.change)}</span></div>`
      : "";
  const paymentsSection =
    payRows || changeRow
      ? `<div class="printTotals" style="margin-top:0.5rem"><p class="label" style="margin-bottom:0.25rem">Pagos</p>${payRows}${changeRow}</div>`
      : "";

  const discountRows = [
    data.totals.lineDiscounts > 0.01
      ? `<div class="printTotalsRow"><span>Descuentos línea</span><span class="num">−${formatMoneyClp(data.totals.lineDiscounts)}</span></div>`
      : "",
    data.totals.orderDiscount > 0.01
      ? `<div class="printTotalsRow"><span>Descuento orden</span><span class="num">−${formatMoneyClp(data.totals.orderDiscount)}</span></div>`
      : "",
  ].join("");

  const companyHeaderLeft = displayName
    ? `<p class="companyKicker">${escapeHtml(razonSocial || "—")}</p>
       <h1 class="companyName">${escapeHtml(displayName)}</h1>`
    : `<h1 class="companyName">${escapeHtml(razonSocial || "—")}</h1>`;

  const addressHtml = addressLines.map((line) => `<p class="companyAddress">${escapeHtml(line)}</p>`).join("");

  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/>
<title>${escapeHtml(documentTitle)} ${escapeHtml(folio)}</title>
<style>
  ${documentPageAtRule(format)}
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; color: #111827; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; font-size: 11px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { width: 100%; max-width: ${documentContentMaxWidth(format)}; margin: 0 auto; padding: 4mm 0; }
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
  .documentBarcodeFooter { margin-top: 1rem; display: flex; justify-content: flex-end; width: 100%; }
  .documentBarcodeFooter .barcode-wrap svg { max-width: 55mm; height: auto; }
</style></head><body>
<div class="page" data-test-id="admin-sale-receipt-print-document">
  <header class="companyHeader">
    <div>
      ${companyHeaderLeft}
      ${addressHtml}
      ${inlineParts.length > 0 ? `<p class="companyInline">${escapeHtml(inlineParts.join(" · "))}</p>` : ""}
    </div>
    <div class="documentMeta">
      <h2 class="documentTitle">${escapeHtml(documentTitle)}</h2>
      <p class="documentDate">Fecha: ${escapeHtml(formatDateSlash(data.issuedAtIso))}</p>
      <p class="documentFolio">Folio ${escapeHtml(folio)}</p>
      ${backorderHeaderLine}
    </div>
  </header>
  <div class="separator" aria-hidden="true"></div>
  <section>
    ${summarySection}
    <table class="table">
      <thead class="thead">
        <tr>
          <th style="width:4ch">#</th>
          <th>Producto</th>
          <th class="numl" style="width:10ch">Cant.</th>
          <th class="numl" style="width:14ch">Precio</th>
          <th class="num" style="width:14ch">Total</th>
        </tr>
      </thead>
      <tbody class="tbody">${lineRows}</tbody>
    </table>
    <div class="printTotals">
      <div class="printTotalsRow"><span>Subtotal neto</span><span class="num">${formatMoneyClp(data.totals.subtotalNet)}</span></div>
      <div class="printTotalsRow"><span>Impuestos</span><span class="num">${formatMoneyClp(data.totals.taxes)}</span></div>
      ${discountRows}
      ${promoRows}
      ${backorderTotals}
    </div>
    ${paymentsSection}
    ${
      barcodeSvg
        ? `<div class="documentBarcodeFooter"><div class="barcode-wrap">${barcodeSvg}</div></div>`
        : ""
    }
  </section>
</div>
</body></html>`;
}

export async function printSaleReceiptDocument(
  data: SaleReceiptPrintData,
  format?: PrintFormat,
): Promise<"agent" | "browser"> {
  const resolved = format ?? getAdminPrintFormatForData(data);
  const title =
    data.documentKind === "backorder"
      ? "Impresión encargo documento"
      : "Impresión venta documento";
  const html = buildSaleReceiptDocumentHtml(data, resolved);
  const folio = data.folio.trim() || "documento";
  return printAdminHtmlViaAgentOrBrowser(html, {
    filename: `${folio}.pdf`,
    iframeTitle: title,
    documentType: data.documentKind === "backorder" ? "BACKORDER" : "SALE",
    internalFolio: folio,
  });
}

/** @deprecated Usar `printSaleReceiptDocument`. */
export function printBackorderDocument(data: SaleReceiptPrintData): void {
  void printSaleReceiptDocument(data);
}

/** @deprecated Usar `buildSaleReceiptDocumentHtml`. */
export function buildBackorderDocumentHtml(data: SaleReceiptPrintData): string {
  return buildSaleReceiptDocumentHtml(data);
}
