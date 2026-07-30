import JsBarcode from "jsbarcode";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** SVG CODE128 del folio para documentos de impresión (solo navegador). */
export function receiptBarcodeSvgString(
  barcodeValue: string,
  opts?: { displayValue?: boolean },
): string {
  if (typeof document === "undefined") return "";
  const value = barcodeValue.trim();
  if (!value) return "";
  const displayValue = opts?.displayValue !== false;
  try {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    JsBarcode(svg, value, {
      format: "CODE128",
      displayValue,
      fontSize: 11,
      height: 42,
      width: 1.35,
      margin: 2,
      textMargin: 2,
    });
    return new XMLSerializer().serializeToString(svg);
  } catch {
    return `<p class="center muted" style="font-size:10px;">${escapeHtml(value)}</p>`;
  }
}
