import { thermalReceiptCssForFormat } from "@/features/pos-print/lib/thermal-receipt-ticket-styles";
import {
  getPrintFormatPreset,
  isDocumentPrintFormat,
  isTicketPrintFormat,
  shouldShowReceptorOnFiscalBoletaTicket,
  type PrintFormat,
} from "@kai/print-service-client";
import type { FiscalBoletaPrintPreview } from "../types/fiscal-emission.types";
import { ticketOperatorHtml } from "@/features/pos-print/lib/ticket-receipt-footer";

function fiscalBoletaDocumentCss(format: PrintFormat): string {
  const preset = getPrintFormatPreset(format);
  const w = 600;
  return `
  @page { size: ${preset.pageSizeCss}; margin: 14mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, Ubuntu, sans-serif;
    font-size: 11px;
    line-height: 1.35;
    color: #111;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .receipt { max-width: 92mm; margin: 0 auto; padding: 0 0 12mm; }
  .store { font-size: 14px; font-weight: ${w}; text-align: center; margin: 0 0 4px; }
  .legal { font-size: 10px; text-align: center; margin: 0; color: #333; }
  .muted { color: #555; font-size: 9.5px; }
  .center { text-align: center; }
  .row { display: flex; justify-content: space-between; gap: 6px; margin: 3px 0; }
  .sep { border-top: 1px dashed #888; margin: 8px 0; }
  table.lines { width: 100%; border-collapse: collapse; font-size: 10px; }
  table.lines td { padding: 4px 0; vertical-align: top; border-bottom: 1px dotted #ccc; }
  table.lines tr:last-child td { border-bottom: none; }
  .name { word-break: break-word; }
  .tright { text-align: right; white-space: nowrap; }
  .tot { font-size: 12px; font-weight: ${w}; }
  .barcode-section { margin-top: 10px; }
  .barcode-wrap.pdf417 { display: flex; justify-content: center; width: 100%; margin: 2px 0; }
  .barcode-wrap.pdf417 svg { width: 100%; max-width: 100%; height: auto; display: block; margin: 0 auto; }
  .wrap { white-space: pre-wrap; word-break: break-word; }
`.trim();
}

export function getFiscalBoletaPrintCss(format: PrintFormat): string {
  return fiscalBoletaCssForFormat(format);
}

function fiscalBoletaCssForFormat(format: PrintFormat): string {
  if (isTicketPrintFormat(format)) {
    return thermalReceiptCssForFormat(format);
  }
  if (isDocumentPrintFormat(format)) {
    return fiscalBoletaDocumentCss(format);
  }
  return thermalReceiptCssForFormat("ticket_80mm");
}

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

function orDash(value: string | null | undefined) {
  const t = value?.trim();
  return t ? escapeHtml(t) : "—";
}

function formatDate(iso: string) {
  try {
    return new Date(`${iso}T12:00:00`).toLocaleDateString("es-CL", { dateStyle: "medium" });
  } catch {
    return iso;
  }
}

/** Contenido interno de `.receipt` (sin envoltorio HTML completo). */
export function buildFiscalBoletaReceiptInnerHtml(
  preview: FiscalBoletaPrintPreview,
  pdf417Svg?: string,
): string {
  const e = preview.emisor;
  const addressLine = [e.address, e.commune, e.city].filter((v) => v?.trim()).join(", ");
  const simulated = preview.isSimulated;

  const lineRows = preview.lines
    .map((line) => {
      const unit = line.unitMeasure?.trim() || "UN";
      const exemptBadge = line.exempt ? ` <span class="muted">(EXENTO)</span>` : "";
      const qtyLine = `${line.quantity} ${unit} × ${formatMoney(line.unitPriceWithIva)}`;
      return `<tr>
        <td class="name">${escapeHtml(line.name)}${exemptBadge}<div class="muted">${escapeHtml(qtyLine)}</div></td>
        <td class="tright qty">${formatMoney(line.lineTotal)}</td>
      </tr>`;
    })
    .join("");

  const netoRow =
    preview.totals.mntNeto > 0
      ? `<div class="row"><span>Neto</span><span>${formatMoney(preview.totals.mntNeto)}</span></div>`
      : "";
  const exeRow =
    preview.totals.mntExe > 0
      ? `<div class="row"><span>Exento</span><span>${formatMoney(preview.totals.mntExe)}</span></div>`
      : "";
  const ivaRow =
    preview.totals.iva > 0
      ? `<div class="row"><span>IVA (19%)</span><span>${formatMoney(preview.totals.iva)}</span></div>`
      : "";

  const resolution =
    e.resolutionNumber?.trim() && e.resolutionDate?.trim()
      ? `<p class="center muted">Res. SII N° ${escapeHtml(e.resolutionNumber.trim())} de ${formatDate(e.resolutionDate)}</p>`
      : "";

  const observation = preview.observation?.trim()
    ? `<div class="sep"></div><p class="wrap muted">${escapeHtml(preview.observation)}</p>`
    : "";

  const timbreLabel = simulated ? "Timbre electrónico (simulado)" : "Timbre electrónico SII";
  const timbreFootnote = simulated
    ? "PDF417 — no válido tributariamente"
    : "Verifique documento en www.sii.cl";

  const timbreBlock = pdf417Svg?.trim()
    ? `<div class="barcode-section">
      <p class="center muted" style="margin:0 0 4px;">${timbreLabel}</p>
      <div class="barcode-wrap pdf417">${pdf417Svg}</div>
      <p class="center muted" style="margin:4px 0 0;font-size:7.5px;">${timbreFootnote}</p>
    </div>`
    : `<div class="barcode-section">
      <div class="barcode-wrap" style="border:1px dashed #888;padding:8px 4px;min-height:36px;">
        <p class="center muted" style="margin:0;">Timbre PDF417 no disponible</p>
      </div>
    </div>`;

  const headerBanner = simulated
    ? `<p class="center muted" style="font-weight:600;letter-spacing:0.04em;">SIMULACIÓN — NO VÁLIDO</p>`
    : "";

  const footerNote = simulated
    ? `<p class="center muted" style="margin-top:6px;">Documento de prueba sin validez fiscal</p>`
    : `<p class="center muted" style="margin-top:6px;">Boleta electrónica</p>`;

  return `${headerBanner}
    <p class="store">${orDash(e.legalName)}</p>
    <p class="legal">RUT: ${orDash(e.rut)}</p>
    ${e.businessActivity?.trim() ? `<p class="center muted">${escapeHtml(e.businessActivity.trim())}</p>` : ""}
    ${addressLine ? `<p class="center muted">${escapeHtml(addressLine)}</p>` : ""}
    <div class="sep"></div>
    <p class="center" style="font-size:11px;font-weight:600;">BOLETA ELECTRÓNICA</p>
    <p class="center muted">Tipo DTE ${preview.tipoDte}</p>
    <div class="row"><span>Folio</span><span>${preview.folio}</span></div>
    <div class="row"><span>Fecha</span><span>${formatDate(preview.issuedAt)}</span></div>
    ${
      shouldShowReceptorOnFiscalBoletaTicket(preview.receptor)
        ? `<div class="row"><span>Receptor</span><span>${escapeHtml(preview.receptor.rut)}</span></div>
    <p class="muted" style="margin:2px 0;">${escapeHtml(preview.receptor.name)}</p>`
        : ""
    }
    <div class="sep"></div>
    <table class="lines"><tbody>${lineRows}</tbody></table>
    <div class="sep"></div>
    ${netoRow}
    ${exeRow}
    ${ivaRow}
    <div class="row tot"><span>TOTAL</span><span>${formatMoney(preview.totals.mntTotal)}</span></div>
    ${resolution}
    ${observation}
    <div class="sep"></div>
    ${timbreBlock}
    ${footerNote}
    ${ticketOperatorHtml(preview.operatorName)}`;
}

export function buildFiscalBoletaPreviewHtml(
  preview: FiscalBoletaPrintPreview,
  format: PrintFormat = "ticket_80mm",
  pdf417Svg?: string,
): string {
  const inner = buildFiscalBoletaReceiptInnerHtml(preview, pdf417Svg);
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Boleta ${preview.folio}</title>
  <style>${fiscalBoletaCssForFormat(format)}</style>
</head>
<body>
  <div class="receipt">
    ${inner}
  </div>
</body>
</html>`;
}
