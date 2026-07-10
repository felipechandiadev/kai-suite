import type { PosSaleReceiptData } from "@/app/(pos)/pos/payment/ui/PosSaleReceiptDialog";
import { buildPosSaleReceiptHtml } from "@/app/(pos)/pos/payment/ui/PosSaleReceiptDialog";
import {
  agentSupportsPosSaleTicket,
  emitPrintServiceJobFailed,
  getPosDocumentPrintMode,
  isPosAgentPrintConfiguredForPurpose,
  posDocumentPrintModeToWireFormat,
  POS_SALE_TICKET_PAYLOAD_VERSION,
  PrintServiceConnection,
  type HelloResponseData,
  type PosSaleTicketPayload,
  type PosSaleTicketPrintExtras,
  type PrintFormat,
} from "@kai/print-service-client";
import {
  enqueueVectorTicketAndAwaitDelivery,
  printPosTicketBrowserFallback,
  withPrintAgentConnection,
} from "@/features/pos-print/lib/pos-agent-print";

const LOG = "[KaiStore print]";

function resolveReceiptLogoUrl(logoUrl: string | null | undefined, origin: string): string {
  const appDefault = `${origin}/logo.png`;
  const raw = logoUrl?.trim();
  if (!raw) return appDefault;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("/")) return `${origin}${raw}`;
  return raw;
}

/** Descarga el logo del comprobante y lo codifica para ESC/POS en el agente. */
export async function fetchReceiptLogoBase64(
  logoUrl: string | null | undefined,
  origin: string,
): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const url = resolveReceiptLogoUrl(logoUrl, origin);
  try {
    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) return null;
    const blob = await res.blob();
    const buf = await blob.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 1) {
      binary += String.fromCharCode(bytes[i]!);
    }
    return btoa(binary);
  } catch {
    return null;
  }
}

export function posSaleReceiptToTicketPayload(
  data: PosSaleReceiptData,
  options?: { logoBase64?: string | null },
): PosSaleTicketPayload {
  const displayName = data.company.nombreFantasia?.trim() || data.company.razonSocial.trim();
  return {
    version: POS_SALE_TICKET_PAYLOAD_VERSION,
    folio: data.folio.trim(),
    issuedAtIso: data.issuedAtIso,
    documentKind: data.documentKind === "backorder" ? "backorder" : "sale",
    backorder: data.backorder ?? null,
    company: {
      razonSocial: data.company.razonSocial.trim() || displayName,
      nombreFantasia: data.company.nombreFantasia?.trim() || null,
      rut: data.company.rut?.trim() || null,
      businessActivity: data.company.businessActivity?.trim() || null,
      logoBase64: options?.logoBase64 ?? null,
    },
    customer: data.customer
      ? {
          name: data.customer.name ?? null,
          document: data.customer.document ?? null,
          phone: data.customer.phone ?? null,
          email: data.customer.email ?? null,
        }
      : null,
    quotation: data.quotation
      ? {
          documentNumber: data.quotation.documentNumber ?? null,
          validUntil: data.quotation.validUntil ?? null,
        }
      : null,
    lines: data.lines.map((l) => ({
      productName: l.productName,
      attributes: l.attributes ?? [],
      quantity: l.quantity,
      unitSymbol: l.unitSymbol,
      unitPriceWithTax: l.unitPriceWithTax,
      lineGross: l.lineGross,
      discountAmount: l.discountAmount,
      discountLabel: l.discountLabel,
    })),
    promotions: data.promotions.map((p) => ({
      code: p.code,
      name: p.name,
      amount: p.amount,
    })),
    totals: {
      subtotalNet: data.totals.subtotalNet,
      taxes: data.totals.taxes,
      lineDiscounts: data.totals.lineDiscounts,
      orderDiscount: data.totals.orderDiscount,
      total: data.totals.total,
      change: data.totals.change,
    },
    payments: data.payments.map((p) => ({
      label: p.label,
      amount: p.amount,
      detail: p.detail,
    })),
    fiscalFolio:
      data.ticketRole === "non_dte_complement"
        ? null
        : data.fiscalFolio?.trim()
          ? data.fiscalFolio.trim()
          : null,
    fiscalBoletaWarning:
      data.ticketRole === "non_dte_complement"
        ? null
        : data.fiscalBoletaWarning?.trim()
          ? data.fiscalBoletaWarning.trim()
          : null,
    ticketRole: data.ticketRole ?? "sale",
    collectionPending: data.collectionPending === true,
    arCollection: data.arCollection?.length ? data.arCollection : null,
    quotaCollection: data.quotaCollection?.length ? data.quotaCollection : null,
    creditInstallmentPlan: data.creditInstallmentPlan?.length ? data.creditInstallmentPlan : null,
    ncPayout: data.ncPayout?.length ? data.ncPayout : null,
    operatorName: data.operatorName?.trim() ? data.operatorName.trim() : null,
  };
}

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

function isPosAndroidTablet(): boolean {
  return typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);
}

async function enqueueSaleTicketOnAgent(
  conn: PrintServiceConnection,
  ticket: PosSaleTicketPayload,
  meta: PosSaleTicketPrintExtras,
  omitDisplayLabel: boolean,
): Promise<unknown> {
  const res = await conn.enqueuePosSaleTicket(ticket, meta, omitDisplayLabel);
  await assertQueued(res);
  return res;
}

/** Ticket de venta: agente ESC/POS (`pos-sale-ticket`) o diálogo del navegador. */
export type PosSaleTicketPrintChannel = "agent" | "browser";

export async function printPosSaleTicketAgentOrBrowser(
  data: PosSaleReceiptData,
  meta: PosSaleTicketPrintExtras & { format?: PrintFormat },
): Promise<PosSaleTicketPrintChannel> {
  if (typeof window === "undefined") return "browser";

  const kind = data.documentKind === "backorder" ? "backorder" : "sale";
  const format =
    meta.format ?? posDocumentPrintModeToWireFormat(getPosDocumentPrintMode(kind));
  const origin = window.location.origin;
  const ticketHtml = buildPosSaleReceiptHtml(data, origin, format);
  const ticketMeta = {
    filename: meta.filename,
    iframeTitle: "Impresión ticket",
    documentType: meta.documentType,
    internalFolio: meta.internalFolio,
    format,
  };
  const enqueueExtras = { ...meta, format, sourceApp: meta.sourceApp ?? "pwa-pos" };

  if (!isPosAgentPrintConfiguredForPurpose("tickets")) {
    console.warn(`${LOG} sin alias Tickets → navegador (ticket térmico)`);
    return printPosTicketBrowserFallback(ticketHtml, ticketMeta);
  }

  const ticketVector = posSaleReceiptToTicketPayload(data);
  let jobId: string | null = null;

  try {
    await withPrintAgentConnection("tickets", async (conn, hello: HelloResponseData | null) => {
      // Si hello tarda (tablet ocupada tras el pago), igual encolamos: el servidor ya recibió hello en onopen.
      if (hello != null && !agentSupportsPosSaleTicket(hello)) {
        throw new Error("agent_no_pos_sale_ticket");
      }
      jobId = await enqueueVectorTicketAndAwaitDelivery(
        conn,
        () => enqueueSaleTicketOnAgent(conn, ticketVector, enqueueExtras, false),
        () => enqueueSaleTicketOnAgent(conn, ticketVector, enqueueExtras, true),
        {
          browserFallback: {
            html: ticketHtml,
            iframeTitle: ticketMeta.iframeTitle,
            kind: "ticket",
          },
        },
      );
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`${LOG} agente no disponible o encolado falló:`, e);
    emitPrintServiceJobFailed(msg);
    if (!isPosAndroidTablet()) {
      console.warn(`${LOG} ticket falló → navegador (ticket térmico)`);
      return printPosTicketBrowserFallback(ticketHtml, ticketMeta);
    }
    throw e instanceof Error ? e : new Error(msg);
  }

  if (jobId) {
    console.warn(`${LOG} ticket → agente ESC/POS (job ${jobId})`);
    return "agent";
  }

  const rejectMsg = "enqueue_rejected";
  emitPrintServiceJobFailed(rejectMsg);
  if (!isPosAndroidTablet()) {
    console.warn(`${LOG} ticket falló → navegador (ticket térmico)`);
    return printPosTicketBrowserFallback(ticketHtml, ticketMeta);
  }
  throw new Error(rejectMsg);
}

export function printPosSaleTicketAgentOrBrowserFireAndForget(
  data: PosSaleReceiptData,
  meta: PosSaleTicketPrintExtras & { format?: PrintFormat },
): void {
  void printPosSaleTicketAgentOrBrowser(data, meta).catch((e) => {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`${LOG} impresión venta falló:`, e);
    emitPrintServiceJobFailed(msg);
  });
}
