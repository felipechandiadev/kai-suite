import { thermalReceiptCssForFormat } from "@/features/print/lib/thermal-receipt-ticket-styles";
import type { PrintFormat } from "@kai/print-service-client";
import type { FiscalBoletaPrintPreview } from "../types/fiscal.types";

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

export function buildFiscalBoletaPreviewHtml(
  preview: FiscalBoletaPrintPreview,
  format: PrintFormat = "ticket_80mm",
  pdf417Svg?: string,
): string {
  const e = preview.emisor;
  const addressLine = [e.address, e.commune, e.city].filter((v) => v?.trim()).join(", ");

  const lineRows = preview.lines
    .map((line) => {
      const unit = line.unitMeasure?.trim() || "UN";
      const exemptBadge = line.exempt
        ? ` <span class="muted">(EXENTO)</span>`
        : "";
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

  const timbreBlock = pdf417Svg?.trim()
    ? `<div class="barcode-section">
      <p class="center muted" style="margin:0 0 4px;">Timbre electrónico (simulado)</p>
      <div class="barcode-wrap pdf417">${pdf417Svg}</div>
      <p class="center muted" style="margin:4px 0 0;font-size:7.5px;">PDF417 — no válido tributariamente</p>
    </div>`
    : `<div class="barcode-section">
      <div class="barcode-wrap" style="border:1px dashed #888;padding:8px 4px;min-height:36px;">
        <p class="center muted" style="margin:0;">Generando timbre PDF417…</p>
      </div>
    </div>`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Boleta de prueba ${escapeHtml(preview.caso)}</title>
  <style>${thermalReceiptCssForFormat(format)}
  .barcode-wrap.pdf417 svg { width: 100%; max-width: 100%; height: auto; display: block; margin: 0 auto; }
  </style>
</head>
<body>
  <div class="receipt">
    <p class="center muted" style="font-weight:600;letter-spacing:0.04em;">SIMULACIÓN — NO VÁLIDO</p>
    <p class="store">${orDash(e.legalName)}</p>
    <p class="legal">RUT: ${orDash(e.rut)}</p>
    ${e.businessActivity?.trim() ? `<p class="center muted">${escapeHtml(e.businessActivity.trim())}</p>` : ""}
    ${addressLine ? `<p class="center muted">${escapeHtml(addressLine)}</p>` : ""}
    <div class="sep"></div>
    <p class="center" style="font-size:11px;font-weight:600;">BOLETA ELECTRÓNICA</p>
    <p class="center muted">Tipo DTE ${preview.tipoDte}</p>
    <div class="row"><span>Folio</span><span>${preview.folio}</span></div>
    <div class="row"><span>Fecha</span><span>${formatDate(preview.issuedAt)}</span></div>
    <div class="row"><span>Receptor</span><span>${escapeHtml(preview.receptor.rut)}</span></div>
    <p class="muted" style="margin:2px 0;">${escapeHtml(preview.receptor.name)}</p>
    <div class="sep"></div>
    <table class="lines"><tbody>${lineRows}</tbody></table>
    <div class="sep"></div>
    ${netoRow}
    ${exeRow}
    ${ivaRow}
    <div class="row tot"><span>TOTAL</span><span>${formatMoney(preview.totals.mntTotal)}</span></div>
    ${resolution}
    <p class="center muted">Ref. Set BE: ${escapeHtml(preview.caso)}</p>
    ${observation}
    <div class="sep"></div>
    ${timbreBlock}
    <p class="center muted" style="margin-top:6px;">Documento de prueba sin validez fiscal</p>
  </div>
</body>
</html>`;
}
