import type { PrintServiceConnection } from "@kai/print-service-client";
import { printHtmlInHiddenIframe } from "@/features/print/lib/print-html-in-hidden-iframe";
import {
  enqueueAdminPrint,
  isAdminPrintAgentConfigured,
  type AdminAgentPrintMeta,
  withAdminPrintAgentConnection,
} from "@/features/print/lib/admin-agent-print";
import { adminHtmlToPdfBase64 } from "@/features/print/lib/admin-html-to-pdf-base64";

function isUnknownPrinterLabelError(e: unknown): boolean {
  return String(e).includes("unknown_printer_display_label");
}

async function tryEnqueueDocumentPdfOnAgent(
  html: string,
  meta: AdminAgentPrintMeta,
): Promise<void> {
  const base64 = await adminHtmlToPdfBase64(html);
  const baseBody = {
    type: "pdf-base64",
    payload: base64,
    filename: meta.filename,
    copies: 1,
    documentType: meta.documentType,
    internalFolio: meta.internalFolio,
  };

  await withAdminPrintAgentConnection("documents", async (conn) => {
    try {
      await enqueueAdminPrint(conn, "documents", baseBody);
    } catch (e) {
      if (!isUnknownPrinterLabelError(e)) throw e;
      await enqueueWithoutDisplayLabel(conn, baseBody);
    }
  });
}

async function enqueueWithoutDisplayLabel(
  conn: PrintServiceConnection,
  baseBody: Record<string, unknown>,
): Promise<void> {
  const res = (await conn.enqueuePrint({
    ...baseBody,
    purpose: "documents",
    sourceApp: "pwa-admin",
  })) as { jobId?: string; queued?: boolean };
  if (res && res.queued === false && !res.jobId) {
    throw new Error("enqueue_rejected");
  }
}

/**
 * Documentos en hoja: PDF al agente (propósito `documents`) si hay alias en Impresión local;
 * si no, diálogo del navegador.
 */
export async function printAdminHtmlViaAgentOrBrowser(
  html: string,
  meta: AdminAgentPrintMeta,
): Promise<"agent" | "browser"> {
  if (typeof window === "undefined") return "browser";

  if (!isAdminPrintAgentConfigured("documents")) {
    printHtmlInHiddenIframe(html, meta.iframeTitle);
    return "browser";
  }

  try {
    await tryEnqueueDocumentPdfOnAgent(html, meta);
    return "agent";
  } catch (e) {
    console.warn("[KaiStore admin print] documento agente:", e);
    printHtmlInHiddenIframe(html, meta.iframeTitle);
    return "browser";
  }
}
