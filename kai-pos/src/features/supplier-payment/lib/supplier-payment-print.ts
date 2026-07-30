import {
  escapeHtml,
  formatDateTimeEs,
  formatMoneyClp,
  resolveReceiptLogoUrl,
} from "@/features/cash-closing/lib/cash-closing-print-format";
import type { SupplierPaymentPrintInput } from "@/features/supplier-payment/lib/supplier-payment-print.types";
import { thermalReceiptCssForFormat } from "@/features/pos-print/lib/thermal-receipt-ticket-styles";
import type { PrintFormat } from "@kai/print-service-client";

export function buildSupplierPaymentTicketHtml(
  input: SupplierPaymentPrintInput,
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
  const method = input.paymentMethodLabel?.trim() || "Efectivo";

  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/><title>Pago a proveedor</title>
<style>${thermalReceiptCssForFormat(format)}
h1{font-size:14px;margin:0 0 4px;text-align:center}
.sub{font-size:10px;text-align:center;color:#555;margin:0 0 8px}
</style></head><body>
${logo ? `<p class="center"><img src="${escapeHtml(logo)}" alt="" style="max-width:48mm;max-height:18mm"/></p>` : ""}
<h1>Pago a proveedor</h1>
<p class="sub">Salida de efectivo · ${escapeHtml(method)}</p>
${originLabel ? `<div class="row"><span>Sucursal / POS</span><span class="tright">${originLabel}</span></div>` : ""}
${input.operatorName?.trim() ? `<div class="row"><span>Operador</span><span class="tright">${escapeHtml(input.operatorName.trim())}</span></div>` : ""}
<div class="row"><span>Comprobante</span><span class="tright">${escapeHtml(input.documentNumber)}</span></div>
<div class="row"><span>Sesión</span><span class="tright">${escapeHtml(input.cashSessionId.slice(0, 8).toUpperCase())}</span></div>
<div class="row"><span>Fecha</span><span>${formatDateTimeEs(input.issuedAt)}</span></div>
<div class="row"><span>Proveedor</span><span class="tright">${escapeHtml(input.supplierName.trim() || "Proveedor")}</span></div>
${input.supplierDocument?.trim() ? `<div class="row"><span>RUT / Doc.</span><span class="tright">${escapeHtml(input.supplierDocument.trim())}</span></div>` : ""}
${input.receptionDocumentNumber?.trim() ? `<div class="row"><span>Recepción</span><span class="tright">${escapeHtml(input.receptionDocumentNumber.trim())}</span></div>` : ""}
${input.supplierDocumentRef?.trim() ? `<div class="row"><span>Doc. proveedor</span><span class="tright">${escapeHtml(input.supplierDocumentRef.trim())}</span></div>` : ""}
${input.reason?.trim() ? `<div class="row"><span>Detalle</span><span class="tright">${escapeHtml(input.reason.trim())}</span></div>` : ""}
<div class="row total"><span>Salida</span><span>${escapeHtml(formatMoneyClp(input.amount))}</span></div>
<p class="legal center muted">${escapeHtml(displayName)}${rut ? ` · RUT ${escapeHtml(rut)}` : ""}</p>
<p class="center muted">Movimiento de caja registrado</p>
</body></html>`;
}
