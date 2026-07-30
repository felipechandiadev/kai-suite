import {
  agentSupportsFiscalBoletaPreview,
  isSharedPrintServiceConnected,
  mergePrinterDisplayLabelForPurposeIntoPrintExtras,
  probePrintServiceReachable,
  type PrintFormat,
  type PrintServiceConnection,
} from "@kai/print-service-client";
import {
  enqueueVectorTicketAndAwaitDelivery,
  withPrintAgentConnection,
} from "@/features/pos-print/lib/pos-agent-print";
import type { FiscalBoletaPrintPreview } from "../types/fiscal-emission.types";
import { fiscalTimbrePdf417SvgForPreview } from "./fiscal-timbre-pdf417";
import { mapPreviewToFiscalBoletaPayload } from "./map-preview-to-fiscal-boleta-payload";
import {
  buildFiscalBoletaBrowserPrintHtml,
  printFiscalBoletaBrowserPdf,
} from "./print-fiscal-boleta-browser-pdf";

const LOG = "[KaiStore fiscal boleta]";
const TICKET_FORMAT: PrintFormat = "ticket_80mm";

async function assertQueued(res: unknown): Promise<void> {
  if (!res || typeof res !== "object") return;
  const r = res as { jobId?: string; queued?: boolean; ok?: boolean; error?: string };
  if (r.ok === false) {
    throw new Error(r.error?.trim() || "enqueue_rejected");
  }
  if (r.queued === false && !r.jobId?.trim()) {
    throw new Error(r.error?.trim() || "enqueue_rejected");
  }
}

async function isPrintAgentReachable(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (isSharedPrintServiceConnected(["tickets"])) return true;
  const probe = await probePrintServiceReachable({ timeoutMs: 2500 });
  return probe.ok;
}

async function enqueueBoletaOnAgent(
  conn: PrintServiceConnection,
  preview: FiscalBoletaPrintPreview,
  omitDisplayLabel: boolean,
): Promise<unknown> {
  const ticket = mapPreviewToFiscalBoletaPayload(preview);
  const folio = String(preview.folio);
  const body: Record<string, unknown> = {
    type: "fiscal-boleta-preview",
    ticket,
    filename: `boleta-${folio}.escpos`,
    copies: 1,
    format: TICKET_FORMAT,
    purpose: "tickets",
    documentType: "FISCAL_BOLETA",
    internalFolio: folio,
    sourceApp: "kai-pos",
  };
  const enqueueBody = omitDisplayLabel
    ? body
    : mergePrinterDisplayLabelForPurposeIntoPrintExtras("tickets", body);
  const res = await conn.enqueuePrint(enqueueBody);
  await assertQueued(res);
  return res;
}

export async function printFiscalBoletaPreview(
  preview: FiscalBoletaPrintPreview,
  options?: { pdf417Svg?: string },
): Promise<"agent" | "browser"> {
  if (typeof window === "undefined") return "browser";

  const pdf417Svg =
    options?.pdf417Svg ?? (await fiscalTimbrePdf417SvgForPreview(preview, TICKET_FORMAT));

  const agentReachable = await isPrintAgentReachable();
  if (!agentReachable) {
    console.warn(`${LOG} sin agente → react-to-print navegador con PDF417`);
    await printFiscalBoletaBrowserPdf(preview, { pdf417Svg });
    return "browser";
  }

  let jobId: string | null = null;
  let browserHtml: string | null = null;

  try {
    await withPrintAgentConnection("tickets", async (conn, hello) => {
      if (hello != null && !agentSupportsFiscalBoletaPreview(hello)) {
        throw new Error("agent_no_fiscal_boleta_preview");
      }
      browserHtml = await buildFiscalBoletaBrowserPrintHtml(preview, { pdf417Svg });
      jobId = await enqueueVectorTicketAndAwaitDelivery(
        conn,
        () => enqueueBoletaOnAgent(conn, preview, false),
        () => enqueueBoletaOnAgent(conn, preview, true),
        {
          browserFallback: {
            html: browserHtml,
            iframeTitle: `Boleta SII ${preview.folio}`,
            kind: "document",
            fiscalBoleta: { preview, pdf417Svg },
          },
        },
      );
    });
  } catch (e) {
    console.warn(`${LOG} agente no disponible o encolado falló:`, e);
    await printFiscalBoletaBrowserPdf(preview, { pdf417Svg });
    return "browser";
  }

  if (jobId) {
    console.warn(`${LOG} boleta → agente ESC/POS (job ${jobId})`);
    return "agent";
  }

  console.warn(`${LOG} sin jobId tras encolar → react-to-print navegador`);
  await printFiscalBoletaBrowserPdf(preview, { pdf417Svg });
  return "browser";
}

export function printFiscalBoletaPreviewFireAndForget(preview: FiscalBoletaPrintPreview): void {
  void printFiscalBoletaPreview(preview);
}
