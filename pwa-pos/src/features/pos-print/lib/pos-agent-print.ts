import {
  PrintServiceConnection,
  buildWebSocketUrl,
  isPosAgentPrintConfiguredForPurpose,
  printFormatToPurpose,
  printServicePageRequiresTls,
  readConfiguredPurposePrinterAliasMap,
  readPrintServiceConfigFromStorage,
  resolvePrintFormat,
  type HelloResponseData,
  type PrintFormat,
  type PosPrintAgentPurpose,
} from "@kai/print-service-client";
import { htmlToPdfBase64 } from "@/features/pos-print/lib/html-to-pdf-base64";
import {
  extractPrintEnqueueJobId,
  registerPosPrintJobBrowserFallbackFromEnqueue,
  type PosPrintJobBrowserFallback,
} from "@/features/pos-print/lib/pos-print-job-browser-fallback";
import { printHtmlInHiddenIframe } from "@/features/pos-print/lib/print-html-in-hidden-iframe";

export type PosAgentPrintMeta = {
  filename: string;
  iframeTitle: string;
  documentType?: string;
  internalFolio?: string;
  format?: PrintFormat;
};

export function isUnknownPrinterLabelError(e: unknown): boolean {
  return String(e).includes("unknown_printer_display_label");
}

/**
 * Tickets vectoriales: si el POS/Admin tiene alias de impresora, usarlo primero (igual que
 * `requestPosTestPrint`). Sin alias, probar la impresora por defecto del agente.
 */
export async function enqueueVectorTicketWithMappingFallback(
  withAlias: () => Promise<unknown>,
  withoutAlias: () => Promise<unknown>,
  browserFallback?: PosPrintJobBrowserFallback,
  options?: { purpose?: PosPrintAgentPurpose },
): Promise<string | null> {
  const purpose = options?.purpose ?? "tickets";
  const aliases = readConfiguredPurposePrinterAliasMap();
  const hasAlias =
    purpose === "tickets" ? Boolean(aliases.tickets.trim()) : Boolean(aliases.documents.trim());
  const attempts = hasAlias ? [withAlias, withoutAlias] : [withoutAlias, withAlias];

  let lastUnknownLabel: unknown = null;
  for (const attempt of attempts) {
    try {
      const res = await attempt();
      if (browserFallback) {
        registerPosPrintJobBrowserFallbackFromEnqueue(res, browserFallback);
      }
      return extractPrintEnqueueJobId(res);
    } catch (e) {
      if (isUnknownPrinterLabelError(e)) {
        lastUnknownLabel = e;
        continue;
      }
      console.warn("[KaiStore print] enqueue vector:", e);
      throw e;
    }
  }
  if (lastUnknownLabel) {
    console.warn("[KaiStore print] enqueue vector: unknown label", lastUnknownLabel);
  }
  return null;
}

/** Encola ticket vectorial y espera entrega (`print_job_done` / `print_job_failed`). */
export async function enqueueVectorTicketAndAwaitDelivery(
  conn: PrintServiceConnection,
  withAlias: () => Promise<unknown>,
  withoutAlias: () => Promise<unknown>,
  options?: {
    browserFallback?: PosPrintJobBrowserFallback;
    timeoutMs?: number;
    purpose?: PosPrintAgentPurpose;
  },
): Promise<string | null> {
  const jobId = await enqueueVectorTicketWithMappingFallback(
    withAlias,
    withoutAlias,
    options?.browserFallback,
    { purpose: options?.purpose ?? "tickets" },
  );
  if (jobId) {
    const delivery = await conn.waitForPrintJob(jobId, options?.timeoutMs ?? 60_000);
    if (delivery.status === "failed") {
      throw new Error(delivery.error);
    }
  }
  return jobId;
}

/** Convierte metadatos de encolado ticket (.escpos) a documento (.pdf). */
export function posTicketMetaToDocumentMeta(meta: PosAgentPrintMeta): PosAgentPrintMeta {
  const stem = meta.filename.replace(/\.(escpos|html)$/i, "") || "documento";
  return {
    ...meta,
    filename: `${stem}.pdf`,
    iframeTitle: meta.iframeTitle.endsWith("(documento)")
      ? meta.iframeTitle
      : `${meta.iframeTitle} (documento)`,
  };
}

/**
 * Si el ticket ESC/POS no pudo imprimirse, respaldo solo en formato documento (hoja):
 * agente `documents` o diálogo del navegador — nunca ticket 80 mm en el browser.
 */
export async function printPosTicketFailureDocumentFallback(
  documentHtml: string,
  ticketMeta: PosAgentPrintMeta,
): Promise<"agent" | "browser"> {
  return printPosHtmlViaAgentOrBrowser(
    documentHtml,
    "documents",
    posTicketMetaToDocumentMeta(ticketMeta),
  );
}

export function printPosTicketFailureDocumentFallbackFireAndForget(
  documentHtml: string,
  ticketMeta: PosAgentPrintMeta,
): void {
  void printPosTicketFailureDocumentFallback(documentHtml, ticketMeta);
}

export function buildAgentWebSocketUrl(): string {
  const cfg = readPrintServiceConfigFromStorage();
  const tls = printServicePageRequiresTls() || cfg.useTls;
  const port = tls ? cfg.wssPort : cfg.port;
  return buildWebSocketUrl(cfg.host, port, tls);
}

export async function withPrintAgentConnection<T>(
  purpose: PosPrintAgentPurpose,
  fn: (conn: PrintServiceConnection, hello: HelloResponseData | null) => Promise<T>,
): Promise<T> {
  const cfg = readPrintServiceConfigFromStorage();
  let hello: HelloResponseData | null = null;
  let reachedOpen = false;

  const conn = new PrintServiceConnection({
    url: buildAgentWebSocketUrl(),
    clientId: "pwa-pos-print",
    appLabel: "KaiStore POS",
    requiredPurposes: [purpose],
    onHello: (d) => {
      hello = d;
    },
  });

  try {
    conn.connect();
    await conn.waitForOpen(15_000);
    reachedOpen = true;
    try {
      hello = await conn.waitForHello(10_000);
    } catch {
      hello = null;
    }
    return await fn(conn, hello);
  } finally {
    conn.disconnect({ ifConnecting: reachedOpen ? "default" : "abandon" });
  }
}

async function tryEnqueueDocumentPdfOnAgent(
  html: string,
  purpose: PosPrintAgentPurpose,
  meta: PosAgentPrintMeta,
): Promise<void> {
  if (purpose === "tickets") {
    throw new Error("tickets_no_pdf");
  }
  const format = resolvePrintFormat(meta.format);
  const base64 = await htmlToPdfBase64(html, format);

  await withPrintAgentConnection(purpose, async (conn) => {
    const baseBody = {
      purpose: printFormatToPurpose(format),
      format,
      type: "pdf-base64",
      payload: base64,
      filename: meta.filename,
      copies: 1,
      sourceApp: "pwa-pos",
      documentType: meta.documentType,
      internalFolio: meta.internalFolio,
    };
    let res: { jobId?: string; queued?: boolean };
    try {
      res = (await conn.enqueuePosPrint(baseBody)) as { jobId?: string; queued?: boolean };
    } catch (e) {
      if (!isUnknownPrinterLabelError(e)) throw e;
      res = (await conn.enqueuePrint(baseBody)) as { jobId?: string; queued?: boolean };
    }
    if (res && res.queued === false && !res.jobId) {
      throw new Error("enqueue_rejected");
    }
    registerPosPrintJobBrowserFallbackFromEnqueue(res, {
      html,
      iframeTitle: meta.iframeTitle,
      kind: "document",
    });
  });
}

/**
 * Documentos: PDF al agente si hay alias; si falla, diálogo del navegador (HTML hoja).
 * No usar con `purpose: "tickets"` — los tickets solo van por ESC/POS o fallback documento.
 */
export async function printPosHtmlViaAgentOrBrowser(
  html: string,
  purpose: PosPrintAgentPurpose,
  meta: PosAgentPrintMeta,
): Promise<"agent" | "browser"> {
  if (typeof window === "undefined") return "browser";

  if (purpose === "tickets") {
    console.warn("[pos-agent-print] tickets: use vector ESC/POS o printPosTicketFailureDocumentFallback");
    return "browser";
  }

  if (!isPosAgentPrintConfiguredForPurpose(purpose)) {
    printHtmlInHiddenIframe(html, meta.iframeTitle);
    return "browser";
  }

  try {
    await tryEnqueueDocumentPdfOnAgent(html, purpose, meta);
    return "agent";
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[pos-agent-print] fallback to browser print:", e);
    }
    printHtmlInHiddenIframe(html, meta.iframeTitle);
    return "browser";
  }
}

export function printPosHtmlViaAgentOrBrowserFireAndForget(
  html: string,
  purpose: PosPrintAgentPurpose,
  meta: PosAgentPrintMeta,
): void {
  void printPosHtmlViaAgentOrBrowser(html, purpose, meta);
}
