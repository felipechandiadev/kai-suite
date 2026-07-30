import {
  buildCompanyInlineParts,
  formatCompanyAddressForPrint,
} from "@kai/document-print";
import type { PrintFormat } from "@kai/print-service-client";
import type { CashClosingPrintInput } from "@/features/cash-closing/lib/cash-closing-print.types";
import {
  documentContentMaxWidth,
  documentPageAtRule,
} from "@/features/pos-print/lib/document-print-format";
import {
  COUNTED_BUCKET_ROWS,
  escapeHtml,
  formatDateTimeEs,
  formatMoneyClp,
} from "@/features/cash-closing/lib/cash-closing-print-format";
import { receiptBarcodeSvgString } from "@/lib/receipt-barcode";

export function buildCashClosingDocumentHtml(
  input: CashClosingPrintInput,
  format: PrintFormat = "document_a4",
): string {
  const c = input.company;
  const razonSocial = (c?.razonSocial ?? "").trim();
  const displayName = (c?.nombreFantasia ?? "").trim();
  const addressLines = formatCompanyAddressForPrint(c?.address);
  const inlineParts = buildCompanyInlineParts({
    rut: c?.rut,
    phone: c?.phone,
    email: c?.mail,
  });
  const folio = input.cashSessionId.slice(0, 8).toUpperCase();
  const barcodeSvg = receiptBarcodeSvgString(folio);
  const originLabel = [input.branchName?.trim(), input.pointOfSaleName?.trim()]
    .filter(Boolean)
    .map((x) => escapeHtml(String(x)))
    .join(" · ");

  const countedTableRows = COUNTED_BUCKET_ROWS.map(({ key, label }) => {
    const amt = input.counted[key];
    return `<tr>
      <td>${escapeHtml(label)}</td>
      <td class="num">${formatMoneyClp(amt)}</td>
    </tr>`;
  }).join("");

  const blind = input.usedBlindCount;
  const diff = typeof input.difference === "number" ? input.difference : null;

  const cuadreRows = blind
    ? `<tr><td>Total declarado (todos los medios)</td><td class="num">${formatMoneyClp(input.countedGrand)}</td></tr>
       <tr><td>Efectivo teórico en sesión</td><td class="num">${formatMoneyClp(input.systemCashExpected ?? 0)}</td></tr>
       <tr><td>Efectivo contado</td><td class="num">${formatMoneyClp(input.counted.cash)}</td></tr>
       <tr class="${diff != null && Math.abs(diff) > 0.01 ? "warn" : ""}"><td>Diferencia (declarado − efectivo teórico)</td><td class="num">${diff != null ? formatMoneyClp(diff) : "—"}</td></tr>
       ${
         typeof input.salesTotal === "number"
           ? `<tr><td>Total ventas de referencia</td><td class="num">${formatMoneyClp(input.salesTotal)}</td></tr>`
           : ""
       }`
    : "";

  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/><title>Arqueo de caja</title>
<style>
  ${documentPageAtRule(format)}
  body { font-family: system-ui, sans-serif; font-size: 11pt; color: #111; margin: 0; max-width: ${documentContentMaxWidth(format)}; }
  h1 { font-size: 16pt; margin: 0 0 4px; }
  .muted { color: #555; font-size: 10pt; }
  .header { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
  .meta { margin: 12px 0; }
  .meta p { margin: 4px 0; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
  th { background: #f4f4f5; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  tr.warn td { color: #b45309; font-weight: 600; }
  .barcode { margin-top: 20px; text-align: center; }
</style></head><body>
  <div class="header">
    <div>
      <h1>ARQUEO DE CAJA</h1>
      <p class="muted">Cierre de sesión de caja</p>
      ${displayName ? `<p><strong>${escapeHtml(displayName)}</strong></p>` : ""}
      ${razonSocial && razonSocial !== displayName ? `<p class="muted">${escapeHtml(razonSocial)}</p>` : ""}
      ${addressLines.map((l) => `<p class="muted">${escapeHtml(l)}</p>`).join("")}
      ${inlineParts.length > 0 ? `<p class="muted">${escapeHtml(inlineParts.join(" · "))}</p>` : ""}
    </div>
    <div class="meta" style="text-align:right;">
      <p><strong>Folio ref.</strong> ${escapeHtml(folio)}</p>
      <p>Apertura: ${formatDateTimeEs(input.sessionOpenedAt)}</p>
      <p>Cierre: ${formatDateTimeEs(input.closedAt)}</p>
      ${originLabel ? `<p>Origen: ${originLabel}</p>` : ""}
      ${input.operatorName?.trim() ? `<p>Operador: ${escapeHtml(input.operatorName.trim())}</p>` : ""}
    </div>
  </div>
  <h2 style="font-size:12pt;margin:16px 0 8px;">Conteo declarado por medio</h2>
  <table>
    <thead><tr><th>Medio</th><th>Monto contado</th></tr></thead>
    <tbody>${countedTableRows}
      <tr><td><strong>Total</strong></td><td class="num"><strong>${formatMoneyClp(input.countedGrand)}</strong></td></tr>
    </tbody>
  </table>
  ${
    blind
      ? `<h2 style="font-size:12pt;margin:16px 0 8px;">Cuadre (cierre ciego)</h2>
         <table><tbody>${cuadreRows}</tbody></table>`
      : ""
  }
  ${input.notes?.trim() ? `<p class="muted"><strong>Notas:</strong> ${escapeHtml(input.notes.trim())}</p>` : ""}
  <p class="muted" style="margin-top:16px;">${escapeHtml(input.message?.trim() || "Sesión de caja cerrada correctamente.")}</p>
  <div class="barcode">${barcodeSvg}</div>
</body></html>`;
}
