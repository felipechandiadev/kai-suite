import {
  agentSupportsPosPaymentInTicket,
  mergeAdminPrinterDisplayLabelForPurposeIntoPrintExtras,
  type HelloResponseData,
  type PosPaymentInTicketPayload,
  type PosPaymentInTicketPrintExtras,
} from "@kai/print-service-client";
import type { PrintServiceConnection } from "@kai/print-service-client";
import { fetchReceiptLogoBase64 } from "@/features/print/lib/fetch-receipt-logo-base64";
import {
  enqueueAdminVectorTicketAndAwaitDelivery,
  isAdminPrintAgentConfigured,
  withAdminPrintAgentConnection,
} from "@/features/print/lib/admin-agent-print";
import { printHtmlInHiddenIframe } from "@/features/print/lib/print-html-in-hidden-iframe";
import type { PaymentInPrintData } from "./payment-in-print.types";
import { buildPaymentInTicketHtml } from "./payment-in-ticket-print-html";

function paymentInToTicketPayload(
  data: PaymentInPrintData,
  logoBase64: string | null,
): PosPaymentInTicketPayload {
  const displayName =
    data.company.nombreFantasia?.trim() || data.company.razonSocial.trim() || "Empresa";
  return {
    version: 1,
    documentNumber: data.folio,
    issuedAt: data.issuedAtIso,
    company: {
      razonSocial: data.company.razonSocial.trim() || displayName,
      nombreFantasia: data.company.nombreFantasia?.trim() || null,
      rut: data.company.rut,
      businessActivity: data.company.businessActivity,
      logoBase64,
    },
    customerName: data.customer?.name ?? null,
    customerDocument: data.customer?.document ?? null,
    branchName: data.branchName,
    pointOfSaleName: data.pointOfSaleName,
    operatorName: data.operatorName,
    totalCollected: data.totalCollected,
    amountPaid: data.amountPaid,
    payments: data.payments.map((p) => ({
      label: p.label,
      amount: p.amount,
      reference: p.detail,
    })),
    allocations: data.allocations.map((a) => ({
      documentNumber: a.documentNumber,
      amount: a.amount,
    })),
    notes: data.notes,
    externalReference: data.externalReference,
  };
}

async function enqueuePaymentInTicket(
  conn: PrintServiceConnection,
  ticket: PosPaymentInTicketPayload,
  meta: PosPaymentInTicketPrintExtras,
  omitDisplayLabel: boolean,
): Promise<unknown> {
  const body: Record<string, unknown> = {
    type: "pos-payment-in-ticket",
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
    return res;
  }
  const res = (await conn.enqueuePrint(
    mergeAdminPrinterDisplayLabelForPurposeIntoPrintExtras("tickets", {
      ...body,
      purpose: "tickets",
      sourceApp: "pwa-admin",
    }),
  )) as { jobId?: string; queued?: boolean };
  if (res && res.queued === false && !res.jobId) {
    throw new Error("enqueue_rejected");
  }
  return res;
}

export async function printAdminPaymentInTicket(
  data: PaymentInPrintData,
): Promise<{ success: boolean; message?: string; channel?: "agent" | "browser" }> {
  if (typeof window === "undefined") {
    return { success: false, message: "Impresión no disponible" };
  }

  const origin = window.location.origin;
  const html = buildPaymentInTicketHtml(data, origin);
  const iframeTitle = "Impresión ticket cobro";

  if (!isAdminPrintAgentConfigured("tickets")) {
    printHtmlInHiddenIframe(html, iframeTitle);
    return { success: true, channel: "browser" };
  }

  const folio = data.folio.trim() || "cobro";
  const meta: PosPaymentInTicketPrintExtras = {
    filename: `${folio}.escpos`,
    documentType: "PAYMENT_IN",
    internalFolio: folio,
  };
  const logoBase64 = await fetchReceiptLogoBase64(data.company.logoUrl, origin);
  const ticket = paymentInToTicketPayload(data, logoBase64);
  let enqueued = false;

  try {
    await withAdminPrintAgentConnection("tickets", async (conn, hello: HelloResponseData | null) => {
      if (!agentSupportsPosPaymentInTicket(hello)) {
        throw new Error("agent_no_pos_payment_in_ticket");
      }
      const jobId = await enqueueAdminVectorTicketAndAwaitDelivery(
        conn,
        () => enqueuePaymentInTicket(conn, ticket, meta, false),
        () => enqueuePaymentInTicket(conn, ticket, meta, true),
      );
      enqueued = Boolean(jobId);
    });
  } catch (e) {
    console.warn("[KaiStore admin print] payment-in ticket agente:", e);
  }

  if (enqueued) {
    return { success: true, channel: "agent" };
  }

  printHtmlInHiddenIframe(html, iframeTitle);
  return { success: true, channel: "browser" };
}
