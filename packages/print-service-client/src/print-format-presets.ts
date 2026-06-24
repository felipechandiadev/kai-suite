import type { PrintFormat } from "./print-format";

export type PrintFormatPreset = {
  format: PrintFormat;
  charsPerLine: number | null;
  pageWidthMm: number;
  contentWidthMm: number;
  barcodeMaxMm: number;
  pageSizeCss: string;
  previewWidthCss: string;
};

export const PRINT_FORMAT_PRESETS: Record<PrintFormat, PrintFormatPreset> = {
  ticket_58mm: {
    format: "ticket_58mm",
    charsPerLine: 32,
    pageWidthMm: 48,
    contentWidthMm: 46,
    barcodeMaxMm: 44,
    pageSizeCss: "48mm auto",
    previewWidthCss: "46mm",
  },
  ticket_80mm: {
    format: "ticket_80mm",
    charsPerLine: 48,
    pageWidthMm: 72,
    contentWidthMm: 70,
    barcodeMaxMm: 62,
    pageSizeCss: "72mm auto",
    previewWidthCss: "80mm",
  },
  document_letter: {
    format: "document_letter",
    charsPerLine: null,
    pageWidthMm: 216,
    contentWidthMm: 190,
    barcodeMaxMm: 55,
    pageSizeCss: "letter",
    previewWidthCss: "100%",
  },
  document_a4: {
    format: "document_a4",
    charsPerLine: null,
    pageWidthMm: 210,
    contentWidthMm: 186,
    barcodeMaxMm: 55,
    pageSizeCss: "A4",
    previewWidthCss: "100%",
  },
};

export function getPrintFormatPreset(format: PrintFormat): PrintFormatPreset {
  return PRINT_FORMAT_PRESETS[format];
}
