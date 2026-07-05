"use client";

import { toSVG } from "bwip-js/browser";
import type { FiscalBoletaPrintPreview } from "../types/fiscal-emission.types";
import {
  isDocumentPrintFormat,
  type PrintFormat,
  fiscalPdf417PreviewScale,
} from "@kai/print-service-client";

export async function fiscalTimbrePdf417Svg(
  payload: string,
  opts?: { scale?: number },
): Promise<string> {
  if (typeof window === "undefined") return "";
  const text = payload.trim();
  if (!text) {
    console.warn("[KaiStore fiscal boleta] PDF417: payload TED vacío");
    return "";
  }

  try {
    const scale = opts?.scale ?? 2;
    return toSVG({
      bcid: "pdf417",
      text,
      scale,
      eclevel: 5,
      paddingwidth: 0,
      paddingheight: 0,
    });
  } catch (e) {
    console.warn("[KaiStore fiscal boleta] PDF417:", e);
    return "";
  }
}

export async function fiscalTimbrePdf417SvgForPreview(
  preview: FiscalBoletaPrintPreview,
  format: PrintFormat,
): Promise<string> {
  const payload = preview.timbrePdf417Payload?.trim() ?? "";
  if (!payload) {
    console.warn("[KaiStore fiscal boleta] PDF417: preview sin timbrePdf417Payload");
    return "";
  }
  const scale = isDocumentPrintFormat(format)
    ? 3
    : fiscalPdf417PreviewScale(format === "ticket_58mm" ? "ticket_58mm" : "ticket_80mm");
  return fiscalTimbrePdf417Svg(payload, { scale });
}
