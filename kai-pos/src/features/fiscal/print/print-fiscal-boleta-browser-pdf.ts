import { printHtmlInHiddenIframe } from "@/features/pos-print/lib/print-html-in-hidden-iframe";
import type { FiscalBoletaPrintPreview } from "../types/fiscal-emission.types";
import { buildFiscalBoletaPreviewHtml } from "./build-fiscal-boleta-preview-html";
import { printFiscalBoletaViaReactToPrint } from "./fiscal-boleta-browser-print-portal";
import { fiscalTimbrePdf417SvgForPreview } from "./fiscal-timbre-pdf417";

/** Formato hoja para «Guardar como PDF» en el navegador (con timbre PDF417 legible). */
export const FISCAL_BOLETA_BROWSER_PDF_FORMAT = "document_a4" as const;

export async function buildFiscalBoletaBrowserPrintHtml(
  preview: FiscalBoletaPrintPreview,
  options?: { pdf417Svg?: string },
): Promise<string> {
  const pdf417Svg =
    options?.pdf417Svg ??
    (await fiscalTimbrePdf417SvgForPreview(preview, FISCAL_BOLETA_BROWSER_PDF_FORMAT));
  return buildFiscalBoletaPreviewHtml(preview, FISCAL_BOLETA_BROWSER_PDF_FORMAT, pdf417Svg);
}

/**
 * Sin Kai Printers: imprime la boleta (A4 + PDF417) con react-to-print en el navegador.
 * El operador puede imprimir o guardar como PDF.
 */
export async function printFiscalBoletaBrowserPdf(
  preview: FiscalBoletaPrintPreview,
  options?: { pdf417Svg?: string },
): Promise<void> {
  const pdf417Svg =
    options?.pdf417Svg ??
    (await fiscalTimbrePdf417SvgForPreview(preview, FISCAL_BOLETA_BROWSER_PDF_FORMAT));

  try {
    await printFiscalBoletaViaReactToPrint(preview, pdf417Svg);
    return;
  } catch (e) {
    console.warn("[KaiStore fiscal boleta] react-to-print no disponible, iframe:", e);
  }

  const html = await buildFiscalBoletaBrowserPrintHtml(preview, { pdf417Svg });
  printHtmlInHiddenIframe(html, `Boleta SII ${preview.folio}`);
}
