import {
  agentSupportsPosLaundryReceptionTicket,
  isPosAgentPrintConfiguredForPurpose,
  POS_LAUNDRY_RECEPTION_TICKET_FOOTER_NOTE,
  POS_LAUNDRY_RECEPTION_TICKET_PAYLOAD_VERSION,
  type HelloResponseData,
  type PosLaundryReceptionTicketPayload,
} from "@kai/print-service-client";
import type { CompanyDetails } from "@/features/company/infrastructure/company.request";
import { getCompanyDetailsAction } from "@/features/company/actions/company.action";
import { buildLaundryReceptionTicketHtml } from "@/features/laundry/lib/laundry-reception-receipt-print";
import { laundryPaymentModeLabel } from "@/features/laundry/lib/laundry-payment-mode-label";
import type {
  LaundryCatalogBundle,
  LaundryReception,
} from "@/features/laundry/types/laundry.types";
import {
  enqueueVectorTicketAndAwaitDelivery,
  printPosTicketBrowserFallback,
  withPrintAgentConnection,
} from "@/features/pos-print/lib/pos-agent-print";
import { readPosContextClient } from "@/features/session/lib/pos-context-storage";

export type LaundryReceptionTicketGarmentInput = {
  label: string;
  quantity: number;
  careInstructions?: string | null;
  services: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
};

export type LaundryReceptionTicketPrintInput = {
  code: string;
  issuedAt?: string;
  company: CompanyDetails | null;
  branchName?: string | null;
  pointOfSaleName?: string | null;
  customerName: string;
  customerPhone?: string | null;
  promisedAt?: string | null;
  paymentModeLabel: string;
  garments: LaundryReceptionTicketGarmentInput[];
  totals: {
    servicesTotal: number;
    depositPaid?: number;
    balanceDue?: number;
  };
  footerNote?: string;
  operatorName?: string | null;
};

function laundryReceptionPrintMeta(code: string) {
  const ref = code.trim().slice(0, 16).replace(/[^\w-]+/g, "-") || "guia";
  return {
    filename: `guia-lavanderia-${ref}.escpos`,
    iframeTitle: "Guía de recepción",
    documentType: "LAUNDRY_RECEPTION",
    internalFolio: ref,
    format: "ticket_80mm" as const,
    purpose: "tickets" as const,
  };
}

export function buildLaundryReceptionTicketPayload(
  input: LaundryReceptionTicketPrintInput,
  logoBase64: string | null = null,
): PosLaundryReceptionTicketPayload {
  const c = input.company;
  const displayName =
    c?.nombreFantasia?.trim() || c?.razonSocial?.trim() || "Empresa";
  return {
    version: POS_LAUNDRY_RECEPTION_TICKET_PAYLOAD_VERSION,
    code: input.code.trim(),
    issuedAt: input.issuedAt || new Date().toISOString(),
    company: {
      razonSocial: c?.razonSocial?.trim() || displayName,
      nombreFantasia: c?.nombreFantasia?.trim() || null,
      rut: c?.rut?.trim() || null,
      businessActivity: c?.businessActivity?.trim() || null,
      logoBase64,
    },
    branchName: input.branchName?.trim() || null,
    pointOfSaleName: input.pointOfSaleName?.trim() || null,
    customerName: input.customerName.trim() || "Cliente",
    customerPhone: input.customerPhone?.trim() || null,
    promisedAt: input.promisedAt?.trim() || null,
    paymentModeLabel: input.paymentModeLabel.trim(),
    garments: input.garments.map((g) => ({
      label: g.label.trim() || "Prenda",
      quantity: Number(g.quantity) || 0,
      careInstructions: g.careInstructions?.trim() || null,
      services: g.services.map((s) => ({
        name: s.name.trim() || "Servicio",
        quantity: Number(s.quantity) || 0,
        unitPrice: Number(s.unitPrice) || 0,
        lineTotal: Number(s.lineTotal) || 0,
      })),
    })),
    totals: {
      servicesTotal: Number(input.totals.servicesTotal) || 0,
      depositPaid:
        input.totals.depositPaid != null ? Number(input.totals.depositPaid) : undefined,
      balanceDue:
        input.totals.balanceDue != null ? Number(input.totals.balanceDue) : undefined,
    },
    footerNote: input.footerNote?.trim() || POS_LAUNDRY_RECEPTION_TICKET_FOOTER_NOTE,
    operatorName: input.operatorName?.trim() || null,
  };
}

export function laundryReceptionToTicketInput(
  reception: LaundryReception,
  catalog: LaundryCatalogBundle | null,
  company: CompanyDetails | null,
  serviceNamesByVariantId: Record<string, string> = {},
  garmentTypeNamesById: Record<string, string> = {},
): LaundryReceptionTicketPrintInput {
  const posCtx = readPosContextClient();
  const typeNameById = new Map(
    (catalog?.garmentTypes ?? []).map((t) => [t.id, t.name] as const),
  );

  const garments = (reception.garments ?? []).map((g) => {
    const typeName =
      typeNameById.get(g.garmentTypeId) ??
      garmentTypeNamesById[g.garmentTypeId] ??
      "Prenda";
    return {
      label: typeName,
      quantity: g.quantity,
      careInstructions: g.careInstructions,
      services: (g.serviceLines ?? []).map((line) => ({
        name: serviceNamesByVariantId[line.productVariantId] ?? "Servicio",
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        lineTotal: line.lineTotal,
      })),
    };
  });

  return {
    code: reception.code?.trim() || reception.id.slice(0, 8),
    issuedAt: reception.receivedAt ?? reception.createdAt,
    company,
    branchName: posCtx?.branchName ?? null,
    pointOfSaleName: posCtx?.pointOfSaleName ?? null,
    customerName: reception.customerNameSnapshot,
    customerPhone: reception.customerPhoneSnapshot,
    promisedAt: reception.promisedAt,
    paymentModeLabel: laundryPaymentModeLabel(reception.paymentMode),
    garments,
    totals: {
      servicesTotal: reception.servicesTotal,
      depositPaid:
        reception.paymentMode === "DEPOSIT_THEN_BALANCE"
          ? reception.depositAmount
          : undefined,
      balanceDue: reception.balanceDue > 0 ? reception.balanceDue : undefined,
    },
  };
}

/** Guía recepción lavandería: agente ESC/POS o diálogo del navegador. */
export async function printLaundryReceptionTicketAgentOrBrowser(
  input: LaundryReceptionTicketPrintInput,
): Promise<"agent" | "browser"> {
  if (typeof window === "undefined") return "browser";

  const meta = laundryReceptionPrintMeta(input.code);
  const origin = window.location.origin;
  const ticketHtml = buildLaundryReceptionTicketHtml(input, origin, meta.format);
  const ticketMeta = {
    filename: meta.filename,
    iframeTitle: meta.iframeTitle,
    documentType: meta.documentType,
    internalFolio: meta.internalFolio,
  };

  if (!isPosAgentPrintConfiguredForPurpose("tickets")) {
    return printPosTicketBrowserFallback(ticketHtml, ticketMeta);
  }

  const ticket = buildLaundryReceptionTicketPayload(input, null);
  let enqueued = false;

  try {
    await withPrintAgentConnection("tickets", async (conn, hello: HelloResponseData | null) => {
      if (hello != null && !agentSupportsPosLaundryReceptionTicket(hello)) {
        throw new Error("agent_no_pos_laundry_reception_ticket");
      }
      const jobId = await enqueueVectorTicketAndAwaitDelivery(
        conn,
        async () => {
          const res = (await conn.enqueuePosLaundryReceptionTicket(ticket, {
            ...meta,
            sourceApp: "pwa-pos",
          })) as { jobId?: string; queued?: boolean };
          if (res && res.queued === false && !res.jobId) {
            throw new Error("enqueue_rejected");
          }
          return res;
        },
        async () => {
          const res = (await conn.enqueuePosLaundryReceptionTicket(
            ticket,
            { ...meta, sourceApp: "pwa-pos" },
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
    console.warn("[KaiStore print] guía lavandería agente:", e);
  }

  if (enqueued) return "agent";

  return printPosTicketBrowserFallback(ticketHtml, ticketMeta);
}

export async function printLaundryReceptionFromRecord(
  reception: LaundryReception,
  catalog: LaundryCatalogBundle | null,
  serviceNamesByVariantId: Record<string, string> = {},
  garmentTypeNamesById: Record<string, string> = {},
): Promise<"agent" | "browser"> {
  const company = (await getCompanyDetailsAction()) ?? null;
  const input = laundryReceptionToTicketInput(
    reception,
    catalog,
    company,
    serviceNamesByVariantId,
    garmentTypeNamesById,
  );
  return printLaundryReceptionTicketAgentOrBrowser(input);
}
