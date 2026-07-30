import {
  agentSupportsPosDiningAccountTicket,
  isPosAgentPrintConfiguredForPurpose,
  POS_DINING_ACCOUNT_TICKET_FOOTER_NOTE,
  POS_DINING_ACCOUNT_TICKET_PAYLOAD_VERSION,
  type HelloResponseData,
  type PosDiningAccountTicketPayload,
} from "@kai/print-service-client";
import type { CompanyDetails } from "@/features/company/infrastructure/company.request";
import { buildDiningAccountTicketHtml } from "@/features/dining/lib/dining-account-receipt-print";
import { readPosContextClient } from "@/features/session/lib/pos-context-storage";
import {
  enqueueVectorTicketAndAwaitDelivery,
  printPosTicketBrowserFallback,
  withPrintAgentConnection,
} from "@/features/pos-print/lib/pos-agent-print";

export type DiningAccountTicketLineInput = {
  name: string;
  quantity: number;
  unitPrice: number;
  notes?: string | null;
};

export type DiningAccountTicketPrintInput = {
  orderId: string;
  displayLabel: string;
  tableCode?: string | null;
  kind: string;
  status: string;
  lines: DiningAccountTicketLineInput[];
  company: CompanyDetails | null;
};

function diningAccountPrintMeta(orderId: string) {
  const ref = orderId.trim().slice(0, 12).replace(/[^\w-]+/g, "-") || "cuenta";
  return {
    filename: `cuenta-dining-${ref}.escpos`,
    iframeTitle: "Cuenta",
    documentType: "DINING_ACCOUNT",
    internalFolio: ref,
    format: "ticket_80mm" as const,
    purpose: "tickets" as const,
  };
}

export function buildDiningAccountTicketPayload(
  input: DiningAccountTicketPrintInput,
  logoBase64: string | null = null,
): PosDiningAccountTicketPayload {
  const c = input.company;
  const displayName =
    c?.nombreFantasia?.trim() || c?.razonSocial?.trim() || "Empresa";
  const posCtx = readPosContextClient();
  const lines = input.lines.map((l) => {
    const quantity = Number(l.quantity) || 0;
    const unitPrice = Number(l.unitPrice) || 0;
    return {
      name: l.name.trim() || "Ítem",
      quantity,
      unitPrice,
      lineTotal: Math.round(quantity * unitPrice),
      notes: l.notes?.trim() || null,
    };
  });
  const total = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  return {
    version: POS_DINING_ACCOUNT_TICKET_PAYLOAD_VERSION,
    company: {
      razonSocial: c?.razonSocial?.trim() || displayName,
      nombreFantasia: c?.nombreFantasia?.trim() || null,
      rut: c?.rut?.trim() || null,
      businessActivity: c?.businessActivity?.trim() || null,
      logoBase64,
    },
    account: {
      displayLabel: input.displayLabel.trim() || "Cuenta",
      tableCode: input.tableCode?.trim() || null,
      kind: input.kind.trim() || "TABLE",
      status: input.status.trim() || "BILLING",
    },
    branchName: posCtx?.branchName?.trim() || null,
    pointOfSaleName: posCtx?.pointOfSaleName?.trim() || null,
    issuedAt: new Date().toISOString(),
    lines,
    totals: { total },
    footerNote: POS_DINING_ACCOUNT_TICKET_FOOTER_NOTE,
  };
}

/** Cuenta dining: agente ESC/POS o diálogo de impresión del navegador. */
export async function printDiningAccountTicketAgentOrBrowser(
  input: DiningAccountTicketPrintInput,
): Promise<"agent" | "browser"> {
  if (typeof window === "undefined") return "browser";

  const meta = diningAccountPrintMeta(input.orderId);
  const origin = window.location.origin;
  const ticketHtml = buildDiningAccountTicketHtml(input, origin, meta.format);
  const ticketMeta = {
    filename: meta.filename,
    iframeTitle: meta.iframeTitle,
    documentType: meta.documentType,
    internalFolio: meta.internalFolio,
  };

  if (!isPosAgentPrintConfiguredForPurpose("tickets")) {
    return printPosTicketBrowserFallback(ticketHtml, ticketMeta);
  }

  const ticket = buildDiningAccountTicketPayload(input, null);
  let enqueued = false;

  try {
    await withPrintAgentConnection("tickets", async (conn, hello: HelloResponseData | null) => {
      if (hello != null && !agentSupportsPosDiningAccountTicket(hello)) {
        throw new Error("agent_no_pos_dining_account_ticket");
      }
      const jobId = await enqueueVectorTicketAndAwaitDelivery(
        conn,
        async () => {
          const res = (await conn.enqueuePosDiningAccountTicket(ticket, {
            ...meta,
            sourceApp: "kai-pos",
          })) as { jobId?: string; queued?: boolean };
          if (res && res.queued === false && !res.jobId) {
            throw new Error("enqueue_rejected");
          }
          return res;
        },
        async () => {
          const res = (await conn.enqueuePosDiningAccountTicket(
            ticket,
            { ...meta, sourceApp: "kai-pos" },
            true,
          )) as { jobId?: string; queued?: boolean };
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
    console.warn("[KaiStore print] cuenta dining agente:", e);
  }

  if (enqueued) return "agent";

  return printPosTicketBrowserFallback(ticketHtml, ticketMeta);
}
