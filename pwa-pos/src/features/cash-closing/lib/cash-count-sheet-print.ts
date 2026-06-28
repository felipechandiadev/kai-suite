import {
  getPosDocumentPrintMode,
  isDocumentPrintFormat,
  posDocumentPrintModeToWireFormat,
  type PrintFormat,
} from "@kai/print-service-client";
import type { CashCountSheetPrintInput } from "@/features/cash-closing/lib/cash-count-sheet-print.types";
import {
  COUNTED_BUCKET_ROWS,
  escapeHtml,
  formatDateTimeEs,
  resolveReceiptLogoUrl,
} from "@/features/cash-closing/lib/cash-closing-print-format";
import { printCashCountSheetTicketVector } from "@/features/cash-closing/lib/cash-count-sheet-ticket-agent";
import { printPosHtmlViaAgentOrBrowser } from "@/features/pos-print/lib/pos-agent-print";
import { documentPageAtRule } from "@/features/pos-print/lib/document-print-format";
import { thermalReceiptCssForFormat } from "@/features/pos-print/lib/thermal-receipt-ticket-styles";

const COUNT_SHEET_CSS = `
  .count-sheet-intro { font-size: 9px; color: #555; margin: 0 0 8px; line-height: 1.35; }
  .count-line { display: flex; align-items: flex-end; gap: 6px; margin: 12px 0 0; font-size: 10px; }
  .count-line-total { margin-top: 16px; font-weight: 600; }
  .count-label { flex-shrink: 0; min-width: 28mm; }
  .count-fill { flex: 1; border-bottom: 1px solid #222; min-height: 1.35em; }
`;

const COUNT_SHEET_DOC_CSS_BASE = `
  body { font-family: system-ui, sans-serif; font-size: 12pt; color: #111; margin: 0; }
  h1 { font-size: 18pt; margin: 0 0 6px; }
  .muted { color: #555; font-size: 10pt; }
  .meta { margin: 14px 0 20px; }
  .meta p { margin: 4px 0; }
  .count-sheet-intro { font-size: 10pt; color: #444; margin: 0 0 12px; max-width: 140mm; }
  .count-line { display: flex; align-items: flex-end; gap: 10px; margin: 18px 0 0; }
  .count-line-total { margin-top: 28px; font-weight: 700; font-size: 13pt; }
  .count-label { flex-shrink: 0; min-width: 52mm; }
  .count-fill { flex: 1; border-bottom: 1.5px solid #111; min-height: 1.5em; }
`;

function countSheetDocCss(format: PrintFormat): string {
  return `${documentPageAtRule(format)}${COUNT_SHEET_DOC_CSS_BASE}`;
}

function buildCountLinesHtml(lines: CashCountSheetPrintInput["paymentLines"]): string {
  const rows = lines.length > 0 ? lines : COUNTED_BUCKET_ROWS.map(({ label }) => ({ label }));
  const items = rows
    .map(
      (row) => `<div class="count-line">
        <span class="count-label">${escapeHtml(row.label.trim() || "—")}</span>
        <span class="count-fill" aria-hidden="true"></span>
      </div>`,
    )
    .join("");
  return `${items}
  <div class="count-line count-line-total">
    <span class="count-label">TOTAL</span>
    <span class="count-fill" aria-hidden="true"></span>
  </div>`;
}

function buildHeaderMeta(input: CashCountSheetPrintInput): string {
  const originLabel = [input.branchName?.trim(), input.pointOfSaleName?.trim()]
    .filter(Boolean)
    .map((x) => escapeHtml(String(x)))
    .join(" · ");
  const c = input.company;
  const displayName = c?.nombreFantasia?.trim() || c?.razonSocial?.trim() || "Empresa";
  const rut = c?.rut?.trim();
  return `
  ${originLabel ? `<div class="row"><span>Sucursal / POS</span><span class="tright">${originLabel}</span></div>` : ""}
  ${input.operatorName?.trim() ? `<div class="row"><span>Operador</span><span class="tright">${escapeHtml(input.operatorName.trim())}</span></div>` : ""}
  <div class="row"><span>Sesión</span><span class="tright">${escapeHtml(input.cashSessionId.slice(0, 8).toUpperCase())}</span></div>
  <div class="row"><span>Apertura</span><span>${formatDateTimeEs(input.sessionOpenedAt)}</span></div>
  <div class="row"><span>Impresión</span><span>${formatDateTimeEs(new Date().toISOString())}</span></div>
  <p class="legal center muted">${escapeHtml(displayName)}${rut ? ` · RUT ${escapeHtml(rut)}` : ""}</p>`;
}

/** Ticket 80 mm: líneas para escribir montos a mano. */
export function buildCashCountSheetTicketHtml(
  input: CashCountSheetPrintInput,
  origin: string,
  format: PrintFormat = "ticket_80mm",
): string {
  const logo = resolveReceiptLogoUrl(input.company?.logoUrl, origin);
  const displayName =
    input.company?.nombreFantasia?.trim() || input.company?.razonSocial?.trim() || "Empresa";

  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/><title>Planilla de conteo</title>
<style>
${thermalReceiptCssForFormat(format)}
${COUNT_SHEET_CSS}
.bold { font-weight: 600; }
</style></head><body>
<div class="receipt">
  <img class="logo" src="${escapeHtml(logo)}" alt="" />
  <p class="store">${escapeHtml(displayName)}</p>
  <div class="sep"></div>
  <p class="center bold">PLANILLA DE CONTEO</p>
  <p class="center muted">Cierre de caja — anotar montos</p>
  <div class="sep"></div>
  ${buildHeaderMeta(input)}
  <div class="sep"></div>
  <p class="count-sheet-intro">Escriba el monto contado en cada línea antes de ingresarlo en el POS.</p>
  ${buildCountLinesHtml(input.paymentLines)}
  <div class="sep"></div>
  <p class="center muted" style="margin-top:8px;">Firma operador: _______________________</p>
</div>
</body></html>`;
}

/** Hoja A4: más espacio para escritura. */
export function buildCashCountSheetDocumentHtml(
  input: CashCountSheetPrintInput,
  format: PrintFormat = "document_a4",
): string {
  const c = input.company;
  const displayName = c?.nombreFantasia?.trim() || c?.razonSocial?.trim() || "";
  const razonSocial = c?.razonSocial?.trim() || "";

  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/><title>Planilla de conteo</title>
<style>${countSheetDocCss(format)}</style></head><body>
  <h1>Planilla de conteo</h1>
  <p class="muted">Cierre de caja — registro manual de montos contados</p>
  ${displayName ? `<p><strong>${escapeHtml(displayName)}</strong></p>` : ""}
  ${razonSocial && razonSocial !== displayName ? `<p class="muted">${escapeHtml(razonSocial)}</p>` : ""}
  <div class="meta">
    ${input.branchName?.trim() ? `<p><strong>Sucursal:</strong> ${escapeHtml(input.branchName.trim())}</p>` : ""}
    ${input.pointOfSaleName?.trim() ? `<p><strong>Punto de venta:</strong> ${escapeHtml(input.pointOfSaleName.trim())}</p>` : ""}
    ${input.operatorName?.trim() ? `<p><strong>Operador:</strong> ${escapeHtml(input.operatorName.trim())}</p>` : ""}
    <p><strong>Sesión:</strong> ${escapeHtml(input.cashSessionId)}</p>
    <p><strong>Apertura:</strong> ${formatDateTimeEs(input.sessionOpenedAt)}</p>
    <p><strong>Impresión:</strong> ${formatDateTimeEs(new Date().toISOString())}</p>
  </div>
  <p class="count-sheet-intro">Complete cada línea con el monto que contó físicamente. Luego transcriba los valores en la pantalla de cierre del POS.</p>
  ${buildCountLinesHtml(input.paymentLines)}
  <p class="muted" style="margin-top:36px;">Firma del operador: _________________________________________________</p>
</body></html>`;
}

function printMeta(input: CashCountSheetPrintInput, format: PrintFormat) {
  const ref = input.cashSessionId.trim().slice(0, 8).toUpperCase() || "conteo";
  return {
    filename: `planilla-conteo-${ref}.pdf`,
    iframeTitle: "Planilla de conteo",
    documentType: "CASH_COUNT_SHEET",
    internalFolio: ref,
    format,
  };
}

export async function printCashCountSheetAwait(
  input: CashCountSheetPrintInput,
  format?: PrintFormat,
): Promise<"agent" | "browser"> {
  if (typeof window === "undefined") return "browser";
  const resolved = format ?? posDocumentPrintModeToWireFormat(getPosDocumentPrintMode("cashCountSheet"));
  const origin = window.location.origin;
  const meta = printMeta(input, resolved);
  if (!isDocumentPrintFormat(resolved)) {
    return printCashCountSheetTicketVector(input, resolved);
  }
  return printPosHtmlViaAgentOrBrowser(
    buildCashCountSheetDocumentHtml(input, resolved),
    "documents",
    meta,
  );
}

export function printCashCountSheet(input: CashCountSheetPrintInput): void {
  void printCashCountSheetAwait(input);
}

export function buildCashCountSheetPreviewHtml(
  input: CashCountSheetPrintInput,
  format?: PrintFormat,
): string | null {
  if (typeof window === "undefined") return null;
  const resolved = format ?? posDocumentPrintModeToWireFormat(getPosDocumentPrintMode("cashCountSheet"));
  return isDocumentPrintFormat(resolved)
    ? buildCashCountSheetDocumentHtml(input, resolved)
    : buildCashCountSheetTicketHtml(input, window.location.origin, resolved);
}
