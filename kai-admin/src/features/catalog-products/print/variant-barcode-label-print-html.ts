import { thermalReceiptCssForFormat } from "@/features/print/lib/thermal-receipt-ticket-styles";
import { receiptBarcodeSvgString } from "@/lib/receipt-barcode";
import type { PrintFormat, VariantBarcodeLabelLayout } from "@kai/print-service-client";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type VariantBarcodeLabelAttrInput = {
  label?: string;
  value: string;
};

export type VariantBarcodeLabelPrintInput = {
  productName: string;
  sku: string;
  barcode: string;
  layout?: VariantBarcodeLabelLayout;
  attributes?: VariantBarcodeLabelAttrInput[];
  priceLabel?: string;
};

/** Ticket térmico (fallback navegador): minimal o detailed. */
export function buildVariantBarcodeLabelTicketHtml(
  input: VariantBarcodeLabelPrintInput,
  format: PrintFormat = "ticket_80mm",
): string {
  const productName = input.productName.trim();
  const sku = input.sku.trim();
  const barcode = input.barcode.trim();
  const layout = input.layout === "detailed" ? "detailed" : "minimal";
  const barcodeSvg = receiptBarcodeSvgString(barcode, { displayValue: false });
  const css = thermalReceiptCssForFormat(format);

  const attrs = (input.attributes ?? [])
    .map((a) => ({
      label: a.label?.trim() || "",
      value: a.value.trim(),
    }))
    .filter((a) => a.value.length > 0);
  const priceLabel = input.priceLabel?.trim() || "";

  const attrsHtml =
    layout === "detailed" && attrs.length > 0
      ? attrs
          .map((a) => {
            const text = a.label ? `${a.label}: ${a.value}` : a.value;
            return `<div class="row"><span>${escapeHtml(text)}</span></div>`;
          })
          .join("")
      : "";

  const priceHtml =
    layout === "detailed" && priceLabel
      ? `<p class="store" style="margin-top:6px;">${escapeHtml(priceLabel)}</p>`
      : "";

  const skuBlock = sku
    ? `<div class="row"><span>SKU</span><span>${escapeHtml(sku)}</span></div>`
    : "";

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
    ${attrsHtml}
    ${priceHtml}
    ${skuBlock}
    <div class="sep"></div>
    <div class="barcode-section barcode-wrap center">${barcodeSvg}</div>
    <p class="center" style="margin:4px 0 0;font-size:11px;font-family:ui-monospace,monospace;letter-spacing:0.04em;">${escapeHtml(barcode)}</p>
  </div>
</body>
</html>`;
}
