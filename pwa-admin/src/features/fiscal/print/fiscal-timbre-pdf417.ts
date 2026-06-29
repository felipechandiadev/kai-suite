import type { FiscalBoletaPrintPreview } from "../types/fiscal.types";

type BwipModule = {
  toSVG: (opts: Record<string, unknown>) => string;
};

/** Genera SVG PDF417 del timbre simulado (solo navegador). */
export async function fiscalTimbrePdf417Svg(
  payload: string,
  opts?: { scale?: number },
): Promise<string> {
  if (typeof window === "undefined") return "";
  const text = payload.trim();
  if (!text) return "";

  try {
    const mod = (await import("bwip-js/browser")) as unknown as BwipModule;
    const scale = opts?.scale ?? 2;
    return mod.toSVG({
      bcid: "pdf417",
      text,
      scale,
      columns: 5,
      rows: 15,
      eclevel: 2,
      paddingwidth: 1,
      paddingheight: 1,
    });
  } catch {
    return "";
  }
}

export async function fiscalTimbrePdf417SvgForPreview(
  preview: FiscalBoletaPrintPreview,
  format: "ticket_58mm" | "ticket_80mm",
): Promise<string> {
  const scale = format === "ticket_58mm" ? 1 : 2;
  return fiscalTimbrePdf417Svg(preview.timbrePdf417Payload, { scale });
}
