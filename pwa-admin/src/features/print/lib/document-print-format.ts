import { getPrintFormatPreset, type PrintFormat } from "@flowstore/print-service-client";

/** Regla `@page` para documentos hoja (carta / A4). */
export function documentPageAtRule(format: PrintFormat): string {
  const preset = getPrintFormatPreset(format);
  return `@page { size: ${preset.pageSizeCss}; margin: 12mm; }`;
}

/** Ancho máximo del bloque `.page` en documentos hoja. */
export function documentContentMaxWidth(format: PrintFormat): string {
  return `${getPrintFormatPreset(format).contentWidthMm}mm`;
}

/** Ancho de vista previa iframe para tickets térmicos. */
export function thermalPreviewWidthCss(format: PrintFormat): string {
  return getPrintFormatPreset(format).previewWidthCss;
}
