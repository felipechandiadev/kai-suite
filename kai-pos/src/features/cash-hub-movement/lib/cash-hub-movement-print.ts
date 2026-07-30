import {
  escapeHtml,
  formatDateTimeEs,
  formatMoneyClp,
  resolveReceiptLogoUrl,
} from "@/features/cash-closing/lib/cash-closing-print-format";
import type { CashHubMovementPrintInput } from "@/features/cash-hub-movement/lib/cash-hub-movement-print.types";
import { thermalReceiptCssForFormat } from "@/features/pos-print/lib/thermal-receipt-ticket-styles";
import type { PrintFormat } from "@kai/print-service-client";

function titleFor(direction: CashHubMovementPrintInput["direction"]): string {
  return direction === "OUT" ? "Egreso a centro de efectivo" : "Ingreso desde centro de efectivo";
}

function subtitleFor(direction: CashHubMovementPrintInput["direction"]): string {
  return direction === "OUT"
    ? "Traslado de efectivo a centro de acopio"
    : "Ingreso de efectivo desde centro de acopio";
}

export function buildCashHubMovementTicketHtml(
  input: CashHubMovementPrintInput,
  origin: string,
  format: PrintFormat = "ticket_80mm",
): string {
  const logo = resolveReceiptLogoUrl(input.company?.logoUrl, origin);
  const displayName =
    input.company?.nombreFantasia?.trim() || input.company?.razonSocial?.trim() || "Empresa";
  const rut = input.company?.rut?.trim();
  const originLabel = [input.branchName?.trim(), input.pointOfSaleName?.trim()]
    .filter(Boolean)
    .map((x) => escapeHtml(String(x)))
    .join(" · ");

  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/><title>${escapeHtml(titleFor(input.direction))}</title>
<style>${thermalReceiptCssForFormat(format)}
h1{font-size:14px;margin:0 0 4px;text-align:center}
.sub{font-size:10px;text-align:center;color:#555;margin:0 0 8px}
</style></head><body>
${logo ? `<p class="center"><img src="${escapeHtml(logo)}" alt="" style="max-width:48mm;max-height:18mm"/></p>` : ""}
<h1>${escapeHtml(titleFor(input.direction))}</h1>
<p class="sub">${escapeHtml(subtitleFor(input.direction))}</p>
${originLabel ? `<div class="row"><span>Sucursal / POS</span><span class="tright">${originLabel}</span></div>` : ""}
${input.operatorName?.trim() ? `<div class="row"><span>Operador</span><span class="tright">${escapeHtml(input.operatorName.trim())}</span></div>` : ""}
<div class="row"><span>Comprobante</span><span class="tright">${escapeHtml(input.documentNumber)}</span></div>
<div class="row"><span>Sesión</span><span class="tright">${escapeHtml(input.cashSessionId.slice(0, 8).toUpperCase())}</span></div>
<div class="row"><span>Fecha</span><span>${formatDateTimeEs(input.issuedAt)}</span></div>
<div class="row"><span>Centro efectivo</span><span class="tright">${escapeHtml(input.cashHubName)}</span></div>
${input.reason?.trim() ? `<div class="row"><span>Motivo</span><span class="tright">${escapeHtml(input.reason.trim())}</span></div>` : ""}
<div class="row total"><span>Monto</span><span>${escapeHtml(formatMoneyClp(input.amount))}</span></div>
<p class="legal center muted">${escapeHtml(displayName)}${rut ? ` · RUT ${escapeHtml(rut)}` : ""}</p>
<p class="center muted">Movimiento registrado</p>
</body></html>`;
}
