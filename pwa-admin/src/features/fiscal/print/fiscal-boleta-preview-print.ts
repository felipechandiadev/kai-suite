import {
  agentSupportsFiscalBoletaPreview,
  type FiscalBoletaPreviewPrintExtras,
  type PrintFormat,
  type PrintServiceConnection,
} from "@kai/print-service-client";
import {
  enqueueAdminPrint,
  isAdminPrintAgentConfigured,
  withAdminPrintAgentConnection,
} from "@/features/print/lib/admin-agent-print";
import { printHtmlInHiddenIframe } from "@/features/print/lib/print-html-in-hidden-iframe";
import type { FiscalBoletaPrintPreview } from "../types/fiscal.types";
import { buildFiscalBoletaPreviewHtml } from "./build-fiscal-boleta-preview-html";
import { fiscalTimbrePdf417SvgForPreview } from "./fiscal-timbre-pdf417";
import { mapPreviewToFiscalBoletaPayload } from "./map-preview-to-fiscal-boleta-payload";

/** Formato fijo solo para fallback HTML del navegador (sin agente). */
const BROWSER_FALLBACK_FORMAT: PrintFormat = "ticket_80mm";

function isUnknownPrinterLabelError(e: unknown): boolean {
  return String(e).includes("unknown_printer_display_label");
}

async function enqueueBoletaOnAgent(
  conn: PrintServiceConnection,
  preview: FiscalBoletaPrintPreview,
  omitDisplayLabel: boolean,
): Promise<void> {
  const ticket = mapPreviewToFiscalBoletaPayload(preview);
  const folio = String(preview.folio);
  const meta: FiscalBoletaPreviewPrintExtras = {
    filename: `boleta-${folio}.escpos`,
    documentType: "FISCAL_BOLETA_PREVIEW",
    internalFolio: folio,
  };
  const body: Record<string, unknown> = {
    type: "fiscal-boleta-preview",
    ticket,
    filename: meta.filename,
    copies: 1,
    documentType: meta.documentType,
    internalFolio: meta.internalFolio,
  };
  if (omitDisplayLabel) {
    const res = (await conn.enqueuePrint({
      ...body,
      purpose: "tickets",
      sourceApp: "pwa-admin",
    })) as { jobId?: string; queued?: boolean };
    if (res && res.queued === false && !res.jobId) {
      throw new Error("enqueue_rejected");
    }
    return;
  }
  await enqueueAdminPrint(conn, "tickets", body);
}

/** Boleta electrónica simulada: agente ESC/POS o diálogo del navegador. */
export async function printFiscalBoletaPreview(
  preview: FiscalBoletaPrintPreview,
  options?: { pdf417Svg?: string },
): Promise<"agent" | "browser"> {
  if (typeof window === "undefined") return "browser";

  const pdf417Svg =
    options?.pdf417Svg ?? (await fiscalTimbrePdf417SvgForPreview(preview, "ticket_80mm"));
  const html = buildFiscalBoletaPreviewHtml(preview, BROWSER_FALLBACK_FORMAT, pdf417Svg);

  if (!isAdminPrintAgentConfigured("tickets")) {
    printHtmlInHiddenIframe(html, "Boleta de prueba");
    return "browser";
  }

  let enqueued = false;
  try {
    await withAdminPrintAgentConnection("tickets", async (conn, hello) => {
      if (!agentSupportsFiscalBoletaPreview(hello)) {
        return;
      }
      try {
        await enqueueBoletaOnAgent(conn, preview, false);
        enqueued = true;
      } catch (e) {
        if (!isUnknownPrinterLabelError(e)) throw e;
        await enqueueBoletaOnAgent(conn, preview, true);
        enqueued = true;
      }
    });
  } catch {
    enqueued = false;
  }

  if (enqueued) return "agent";

  printHtmlInHiddenIframe(html, "Boleta de prueba");
  return "browser";
}
