/** Opciones para HTML de comprobantes (impresión vs vista previa en POS). */
export type PosPrintHtmlOptions = {
  /** false en vistas previa del POS; true por defecto al imprimir. */
  showLogo?: boolean;
};

export function printHtmlShowsLogo(options?: PosPrintHtmlOptions): boolean {
  return options?.showLogo !== false;
}
