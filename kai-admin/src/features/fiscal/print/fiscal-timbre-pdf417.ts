import type { FiscalBoletaPrintPreview } from "../types/fiscal.types";
import { fiscalPdf417PreviewScale } from "@kai/print-service-client";

type BwipModule = {
  toSVG: (opts: Record<string, unknown>) => string;
};

/** CSS timbre PDF417: ancho completo del ticket (paridad con impresión térmica). */
export const FISCAL_PDF417_SVG_CSS =
  ".barcode-wrap.pdf417 { display: flex; justify-content: center; width: 100%; margin: 2px 0; }" +
  ".barcode-wrap.pdf417 svg { width: 100%; max-width: 100%; height: auto; display: block; margin: 0 auto; }";

/** Genera SVG PDF417 del timbre simulado (solo navegador). */
export async function fiscalTimbrePdf417Svg(
  payload: string,
  opts?: { scale?: number },
): Promise<string> {
  if (typeof window === "undefined") return "";
  const text = payload.trim();
  if (!text) return "";

  try {
    const mod = (await import("bwip-js/browser")) as BwipModule;
    const scale = opts?.scale ?? 2;
    return mod.toSVG({
      bcid: "pdf417",
      text,
      scale,
      eclevel: 5,
      paddingwidth: 0,
      paddingheight: 0,
    });
  } catch {
    return "";
  }
}

export async function fiscalTimbrePdf417SvgForPreview(
  preview: FiscalBoletaPrintPreview,
  format: "ticket_58mm" | "ticket_80mm",
): Promise<string> {
  const scale = fiscalPdf417PreviewScale(format);
  return fiscalTimbrePdf417Svg(preview.timbrePdf417Payload, { scale });
}
