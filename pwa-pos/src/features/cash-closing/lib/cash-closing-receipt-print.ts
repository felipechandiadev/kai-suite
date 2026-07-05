import type { CashClosingPrintInput } from "@/features/cash-closing/lib/cash-closing-print.types";
import {
  COUNTED_BUCKET_ROWS,
  escapeHtml,
  formatDateTimeEs,
  formatMoneyClp,
  resolveReceiptLogoUrl,
} from "@/features/cash-closing/lib/cash-closing-print-format";
import type { PrintFormat } from "@kai/print-service-client";
import { thermalReceiptCssForFormat } from "@/features/pos-print/lib/thermal-receipt-ticket-styles";
import {
  printHtmlShowsLogo,
  type PosPrintHtmlOptions,
} from "@/features/pos-print/lib/pos-print-html-options";

export function buildCashClosingReceiptHtml(
  input: CashClosingPrintInput,
  origin: string,
  format: PrintFormat = "ticket_80mm",
  options?: PosPrintHtmlOptions,
): string {
  const c = input.company;
  const showLogo = printHtmlShowsLogo(options);
  const logo = showLogo ? resolveReceiptLogoUrl(c?.logoUrl, origin) : "";
  const displayName = c?.nombreFantasia?.trim() || c?.razonSocial?.trim() || "Empresa";
  const originLabel = [input.branchName?.trim(), input.pointOfSaleName?.trim()].filter(Boolean).join(" · ");

  const countedRows = COUNTED_BUCKET_ROWS.map(({ key, label }) => {
    const amt = input.counted[key];
    if (amt <= 0) return "";
    return `<div class="row"><span>${escapeHtml(label)}</span><span class="tright">${formatMoneyClp(amt)}</span></div>`;
  }).join("");

  const blind = input.usedBlindCount;
  const diff = typeof input.difference === "number" ? input.difference : null;
  const diffClass =
    diff != null && Math.abs(diff) > 0.01 ? " diff-warn" : "";

  const cuadreBlock = blind
    ? `<div class="sep"></div>
       <div class="section-title">Cuadre</div>
       <div class="row"><span>Total declarado</span><span class="tright">${formatMoneyClp(input.countedGrand)}</span></div>
       <div class="row"><span>Efectivo teórico</span><span class="tright">${formatMoneyClp(input.systemCashExpected ?? 0)}</span></div>
       <div class="row"><span>Efectivo contado</span><span class="tright">${formatMoneyClp(input.counted.cash)}</span></div>
       <div class="row${diffClass}"><span>Diferencia</span><span class="tright">${diff != null ? formatMoneyClp(diff) : "—"}</span></div>
       ${typeof input.salesTotal === "number" ? `<div class="row muted"><span>Ventas sesión</span><span class="tright">${formatMoneyClp(input.salesTotal)}</span></div>` : ""}`
    : "";

  const notesBlock = input.notes?.trim()
    ? `<div class="sep"></div><div class="section-title">Notas</div><p class="muted">${escapeHtml(input.notes.trim())}</p>`
    : "";

  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/><title>Arqueo caja</title>
<style>${thermalReceiptCssForFormat(format)}
.diff-warn span { color: #b45309; font-weight: ${600}; }
</style></head><body>
<div class="receipt">
  ${showLogo ? `<div class="center"><img src="${escapeHtml(logo)}" alt="" class="logo" /></div>` : ""}
  <div class="center bold">${escapeHtml(displayName)}</div>
  <div class="sep"></div>
  <div class="center bold">ARQUEO DE CAJA</div>
  <div class="center muted">Cierre de sesión</div>
  <div class="sep"></div>
  ${originLabel ? `<div class="row"><span>Origen</span><span class="tright" style="max-width:42mm;text-align:right;">${escapeHtml(originLabel)}</span></div>` : ""}
  ${input.operatorName?.trim() ? `<div class="row"><span>Operador</span><span class="tright">${escapeHtml(input.operatorName.trim())}</span></div>` : ""}
  <div class="row"><span>Apertura</span><span>${formatDateTimeEs(input.sessionOpenedAt)}</span></div>
  <div class="row"><span>Cierre</span><span>${formatDateTimeEs(input.closedAt)}</span></div>
  <div class="sep"></div>
  <div class="section-title">Conteo declarado</div>
  ${countedRows || '<p class="muted center">Sin montos</p>'}
  <div class="row tot"><span>TOTAL</span><span>${formatMoneyClp(input.countedGrand)}</span></div>
  ${cuadreBlock}
  ${notesBlock}
  <div class="sep"></div>
  <p class="center muted">${escapeHtml(input.message?.trim() || "Sesión cerrada")}</p>
</div>
</body></html>`;
}
