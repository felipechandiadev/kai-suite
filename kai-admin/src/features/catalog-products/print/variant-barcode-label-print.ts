import {
  VARIANT_BARCODE_LABEL_PAYLOAD_VERSION,
  agentSupportsVariantBarcodeLabel,
  type HelloResponseData,
  type VariantBarcodeLabelPayload,
  type VariantBarcodeLabelPrintExtras,
} from "@kai/print-service-client";
import type { PrintServiceConnection } from "@kai/print-service-client";
import {
  enqueueAdminPrint,
  isAdminPrintAgentConfigured,
  withAdminPrintAgentConnection,
} from "@/features/print/lib/admin-agent-print";
import { printHtmlInHiddenIframe } from "@/features/print/lib/print-html-in-hidden-iframe";
import {
  buildVariantBarcodeLabelTicketHtml,
  type VariantBarcodeLabelPrintInput,
} from "./variant-barcode-label-print-html";

function isUnknownPrinterLabelError(e: unknown): boolean {
  return String(e).includes("unknown_printer_display_label");
}

function toPayload(input: VariantBarcodeLabelPrintInput): VariantBarcodeLabelPayload {
  return {
    version: VARIANT_BARCODE_LABEL_PAYLOAD_VERSION,
    productName: input.productName.trim(),
    sku: input.sku.trim(),
    barcode: input.barcode.trim(),
  };
}

async function enqueueVariantBarcodeOnAgent(
  conn: PrintServiceConnection,
  ticket: VariantBarcodeLabelPayload,
  meta: VariantBarcodeLabelPrintExtras,
  omitDisplayLabel: boolean,
): Promise<void> {
  const body: Record<string, unknown> = {
    type: "variant-barcode-label",
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
      sourceApp: "kai-admin",
    })) as { jobId?: string; queued?: boolean };
    if (res && res.queued === false && !res.jobId) {
      throw new Error("enqueue_rejected");
    }
    return;
  }
  await enqueueAdminPrint(conn, "tickets", body);
}

/** Comprobante térmico con barcode: agente ESC/POS o diálogo del navegador. */
export async function printVariantBarcodeLabel(
  input: VariantBarcodeLabelPrintInput,
): Promise<"agent" | "browser"> {
  if (typeof window === "undefined") return "browser";

  const barcode = input.barcode.trim();
  if (!barcode) {
    throw new Error("barcode_required");
  }

  const html = buildVariantBarcodeLabelTicketHtml(input);
  const iframeTitle = "Impresión código de barras";

  if (!isAdminPrintAgentConfigured("tickets")) {
    printHtmlInHiddenIframe(html, iframeTitle);
    return "browser";
  }

  const meta: VariantBarcodeLabelPrintExtras = {
    filename: `${barcode}.escpos`,
    documentType: "VARIANT_BARCODE",
    internalFolio: barcode,
  };
  const ticket = toPayload(input);
  let enqueued = false;

  try {
    await withAdminPrintAgentConnection("tickets", async (conn, hello: HelloResponseData | null) => {
      if (!agentSupportsVariantBarcodeLabel(hello)) {
        throw new Error("agent_no_variant_barcode_label");
      }
      try {
        await enqueueVariantBarcodeOnAgent(conn, ticket, meta, false);
        enqueued = true;
      } catch (e) {
        if (!isUnknownPrinterLabelError(e)) throw e;
        await enqueueVariantBarcodeOnAgent(conn, ticket, meta, true);
        enqueued = true;
      }
    });
  } catch (e) {
    console.warn("[KaiStore admin print] variant barcode agente:", e);
  }

  if (enqueued) return "agent";

  printHtmlInHiddenIframe(html, iframeTitle);
  return "browser";
}
