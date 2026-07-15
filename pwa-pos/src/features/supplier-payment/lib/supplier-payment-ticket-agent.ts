import {
  agentSupportsPosSupplierPaymentTicket,
  isPosAgentPrintConfiguredForPurpose,
  POS_SUPPLIER_PAYMENT_TICKET_PAYLOAD_VERSION,
  type PosSupplierPaymentTicketPayload,
  type PrintFormat,
} from "@kai/print-service-client";
import type { SupplierPaymentPrintInput } from "@/features/supplier-payment/lib/supplier-payment-print.types";
import { buildSupplierPaymentTicketHtml } from "@/features/supplier-payment/lib/supplier-payment-print";
import {
  enqueueVectorTicketAndAwaitDelivery,
  printPosTicketBrowserFallback,
  withPrintAgentConnection,
} from "@/features/pos-print/lib/pos-agent-print";

function paymentPrintMeta(input: SupplierPaymentPrintInput) {
  const stem = input.documentNumber.trim().replace(/[^\w.-]+/g, "-") || "pago-proveedor";
  return {
    filename: `pago-proveedor-${stem}.escpos`,
    iframeTitle: "Pago a proveedor",
    documentType: "SUPPLIER_PAYMENT",
    internalFolio: input.documentNumber.trim(),
  };
}

function paymentToTicketPayload(
  input: SupplierPaymentPrintInput,
  logoBase64: string | null,
): PosSupplierPaymentTicketPayload {
  const c = input.company;
  const displayName = c?.nombreFantasia?.trim() || c?.razonSocial?.trim() || "Empresa";
  return {
    version: POS_SUPPLIER_PAYMENT_TICKET_PAYLOAD_VERSION,
    documentNumber: input.documentNumber.trim(),
    issuedAt: input.issuedAt,
    amount: input.amount,
    supplierName: input.supplierName.trim() || "Proveedor",
    supplierDocument: input.supplierDocument?.trim() || null,
    receptionDocumentNumber: input.receptionDocumentNumber?.trim() || null,
    supplierDocumentRef: input.supplierDocumentRef?.trim() || null,
    cashSessionId: input.cashSessionId.trim(),
    paymentMethodLabel: input.paymentMethodLabel?.trim() || "Efectivo",
    reason: input.reason?.trim() || null,
    company: {
      razonSocial: c?.razonSocial?.trim() || displayName,
      nombreFantasia: c?.nombreFantasia?.trim() || null,
      rut: c?.rut?.trim() || null,
      businessActivity: c?.businessActivity?.trim() || null,
      logoBase64,
    },
    branchName: input.branchName?.trim() || null,
    pointOfSaleName: input.pointOfSaleName?.trim() || null,
    operatorName: input.operatorName?.trim() || null,
  };
}

export async function printSupplierPaymentTicketVector(
  input: SupplierPaymentPrintInput,
  format: PrintFormat = "ticket_80mm",
): Promise<"agent" | "browser"> {
  if (typeof window === "undefined") return "browser";

  const meta = { ...paymentPrintMeta(input), format };
  const origin = window.location.origin;
  const ticketHtml = buildSupplierPaymentTicketHtml(input, origin, format);

  if (!isPosAgentPrintConfiguredForPurpose("tickets")) {
    return printPosTicketBrowserFallback(ticketHtml, meta);
  }

  const ticket = paymentToTicketPayload(input, null);
  let enqueued = false;

  try {
    await withPrintAgentConnection("tickets", async (conn, hello) => {
      if (!agentSupportsPosSupplierPaymentTicket(hello)) {
        throw new Error("agent_no_pos_supplier_payment_ticket");
      }
      const jobId = await enqueueVectorTicketAndAwaitDelivery(
        conn,
        async () => {
          const res = (await conn.enqueuePosSupplierPaymentTicket(ticket, {
            ...meta,
            sourceApp: "pwa-pos",
          }, false)) as { jobId?: string; queued?: boolean };
          if (res && res.queued === false && !res.jobId) {
            throw new Error("enqueue_rejected");
          }
          return res;
        },
        async () => {
          const res = (await conn.enqueuePosSupplierPaymentTicket(ticket, {
            ...meta,
            sourceApp: "pwa-pos",
          }, true)) as { jobId?: string; queued?: boolean };
          if (res && res.queued === false && !res.jobId) {
            throw new Error("enqueue_rejected");
          }
          return res;
        },
        {
          browserFallback: {
            html: ticketHtml,
            iframeTitle: meta.iframeTitle,
            kind: "ticket",
          },
        },
      );
      enqueued = Boolean(jobId);
    });
  } catch {
    return printPosTicketBrowserFallback(ticketHtml, meta);
  }

  return enqueued ? "agent" : "browser";
}

export function printSupplierPayment(input: SupplierPaymentPrintInput): void {
  void printSupplierPaymentTicketVector(input);
}
