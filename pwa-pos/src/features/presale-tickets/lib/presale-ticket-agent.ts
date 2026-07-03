import {
  agentSupportsPosPresaleTicket,
  getPosDocumentPrintMode,
  isPosAgentPrintConfiguredForPurpose,
  posDocumentPrintModeToWireFormat,
  POS_PRESALE_TICKET_PAYLOAD_VERSION,
  type HelloResponseData,
  type PosPresaleTicketPayload,
  type PosPresaleTicketPrintExtras,
  type PrintFormat,
} from "@kai/print-service-client";
import type { CompanyDetails } from "@/features/company/infrastructure/company.request";
import { getCompanyDetailsAction } from "@/features/company/actions/company.action";
import { fetchReceiptLogoBase64 } from "@/features/pos-print/lib/pos-sale-ticket-agent";
import {
  enqueueVectorTicketAndAwaitDelivery,
  printPosTicketBrowserFallback,
  withPrintAgentConnection,
} from "@/features/pos-print/lib/pos-agent-print";
import type { PresaleTicketDetail } from "../types/presale-ticket.types";
import { buildPresaleTicketHtml } from "./presale-ticket-print";

export function presaleTicketToPayload(
  ticket: PresaleTicketDetail,
  company: CompanyDetails | null,
  logoBase64: string | null,
): PosPresaleTicketPayload {
  const displayName = company?.nombreFantasia?.trim() || company?.razonSocial?.trim() || "Empresa";
  return {
    version: POS_PRESALE_TICKET_PAYLOAD_VERSION,
    code: ticket.code.trim(),
    qrPayload: ticket.code.trim(),
    issuedAt: ticket.createdAt,
    company: {
      razonSocial: company?.razonSocial?.trim() || displayName,
      nombreFantasia: company?.nombreFantasia?.trim() || null,
      rut: company?.rut?.trim() || null,
      businessActivity: company?.businessActivity?.trim() || null,
      logoBase64,
    },
    branchName: ticket.branchName?.trim() || null,
    pointOfSaleName: ticket.pointOfSaleName?.trim() || null,
    lines: ticket.lines.map((l) => ({
      productName: l.productName,
      variantName: l.variantName?.trim() || null,
      quantity: l.quantity,
      total: l.total,
    })),
    total: ticket.total,
  };
}

/** Ticket de preventa: agente ESC/POS (`pos-presale-ticket`) o diálogo del navegador. */
export async function printPresaleTicketAgentOrBrowser(
  ticket: PresaleTicketDetail,
  options?: { format?: PrintFormat; companyName?: string | null },
): Promise<"agent" | "browser"> {
  if (typeof window === "undefined") return "browser";

  const resolved =
    options?.format ?? posDocumentPrintModeToWireFormat(getPosDocumentPrintMode("presale"));
  const code = ticket.code.trim();
  const meta: PosPresaleTicketPrintExtras & { format: PrintFormat } = {
    filename: `${code}.escpos`,
    documentType: "PRESALE",
    internalFolio: code,
    format: resolved,
    sourceApp: "pwa-pos",
  };
  const companyLabel =
    options?.companyName?.trim() ||
    ticket.pointOfSaleName?.trim() ||
    ticket.branchName?.trim() ||
    null;
  const ticketHtml = buildPresaleTicketHtml(ticket, companyLabel);
  const ticketMeta = {
    filename: meta.filename,
    iframeTitle: "Impresión ticket preventa",
    documentType: meta.documentType,
    internalFolio: meta.internalFolio,
    format: resolved,
  };

  if (!isPosAgentPrintConfiguredForPurpose("tickets")) {
    printPresaleTicketHtml(ticket, companyLabel);
    return "browser";
  }

  const company = await getCompanyDetailsAction();
  const logoBase64 = await fetchReceiptLogoBase64(
    company?.logoUrl,
    window.location.origin,
  );
  const payload = presaleTicketToPayload(ticket, company, logoBase64);
  let enqueued = false;

  try {
    await withPrintAgentConnection("tickets", async (conn, hello: HelloResponseData | null) => {
      if (!agentSupportsPosPresaleTicket(hello)) {
        throw new Error("agent_no_pos_presale_ticket");
      }
      const jobId = await enqueueVectorTicketAndAwaitDelivery(
        conn,
        async () => {
          const res = (await conn.enqueuePosPresaleTicket(payload, meta)) as {
            jobId?: string;
            queued?: boolean;
          };
          if (res && res.queued === false && !res.jobId) {
            throw new Error("enqueue_rejected");
          }
          return res;
        },
        async () => {
          const res = (await conn.enqueuePosPresaleTicket(payload, meta, true)) as {
            jobId?: string;
            queued?: boolean;
          };
          if (res && res.queued === false && !res.jobId) {
            throw new Error("enqueue_rejected");
          }
          return res;
        },
        {
          browserFallback: {
            html: ticketHtml,
            iframeTitle: ticketMeta.iframeTitle,
            kind: "ticket",
          },
        },
      );
      enqueued = Boolean(jobId);
    });
  } catch (e) {
    console.warn("[KaiStore print] preventa agente:", e);
  }

  if (enqueued) return "agent";

  return printPosTicketBrowserFallback(ticketHtml, ticketMeta);
}

export function printPresaleTicketAgentOrBrowserFireAndForget(
  ticket: PresaleTicketDetail,
  options?: { format?: PrintFormat; companyName?: string | null },
): void {
  void printPresaleTicketAgentOrBrowser(ticket, options);
}

// Re-export for callers that only need browser HTML.
export { printPresaleTicketHtml } from "./presale-ticket-print";
