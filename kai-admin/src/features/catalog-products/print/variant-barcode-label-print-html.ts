import { thermalReceiptCssForFormat } from "@/features/print/lib/thermal-receipt-ticket-styles";
import { receiptBarcodeSvgString } from "@/lib/receipt-barcode";
import type { PrintFormat } from "@kai/print-service-client";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type VariantBarcodeLabelPrintInput = {
  productName: string;
  sku: string;
  barcode: string;
};

/** Ticket térmico mínimo (fallback navegador). */
export function buildVariantBarcodeLabelTicketHtml(
  input: VariantBarcodeLabelPrintInput,
  format: PrintFormat = "ticket_80mm",
): string {
  const productName = input.productName.trim();
  const sku = input.sku.trim();
  const barcode = input.barcode.trim();
  const barcodeSvg = receiptBarcodeSvgString(barcode, { displayValue: false });

  const css = thermalReceiptCssForFormat(format);

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Código de barras</title>
  <style>${css}</style>
</head>
<body>
  <div class="receipt">
    ${productName ? `<p class="store">${escapeHtml(productName)}</p>` : ""}
    ${sku ? `<div class="row"><span>SKU</span><span>${escapeHtml(sku)}</span></div>` : ""}
    <div class="sep"></div>
    <div class="barcode-section barcode-wrap center">${barcodeSvg}</div>
    <p class="center" style="margin:4px 0 0;font-size:11px;font-family:ui-monospace,monospace;letter-spacing:0.04em;">${escapeHtml(barcode)}</p>
  </div>
</body>
</html>`;
}
