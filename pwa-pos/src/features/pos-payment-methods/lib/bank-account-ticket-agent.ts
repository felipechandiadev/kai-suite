import {
  agentSupportsPosBankAccountTicket,
  isPosAgentPrintConfiguredForPurpose,
  POS_BANK_ACCOUNT_TICKET_PAYLOAD_VERSION,
  type PosBankAccountTicketPayload,
} from "@flowstore/print-service-client";
import type { CompanyDetails } from "@/features/company/infrastructure/company.request";
import { readPosContextClient } from "@/features/session/lib/pos-context-storage";
import { fetchReceiptLogoBase64 } from "@/features/pos-print/lib/pos-sale-ticket-agent";
import {
  enqueueVectorTicketAndAwaitDelivery,
  withPrintAgentConnection,
} from "@/features/pos-print/lib/pos-agent-print";

export type BankAccountTicketPrintInput = {
  accountKey: string;
  bankName: string;
  accountType: string;
  accountNumber: string;
  accountHolderName?: string | null;
  notes?: string | null;
  isPrimary?: boolean;
  paymentMethodLabel?: string | null;
  company: CompanyDetails | null;
};

function bankAccountPrintMeta(accountKey: string) {
  const ref =
    accountKey.trim().slice(0, 12).replace(/[^\w-]+/g, "-") || "cuenta";
  return {
    filename: `cuenta-bancaria-${ref}.escpos`,
    iframeTitle: "Datos transferencia",
    documentType: "BANK_ACCOUNT",
    internalFolio: ref,
    format: "ticket_80mm" as const,
    purpose: "tickets" as const,
  };
}

function toTicketPayload(
  input: BankAccountTicketPrintInput,
  logoBase64: string | null,
): PosBankAccountTicketPayload {
  const c = input.company;
  const displayName = c?.nombreFantasia?.trim() || c?.razonSocial?.trim() || "Empresa";
  const posCtx = readPosContextClient();
  return {
    version: POS_BANK_ACCOUNT_TICKET_PAYLOAD_VERSION,
    accountKey: input.accountKey.trim(),
    bankName: input.bankName.trim(),
    accountType: input.accountType.trim(),
    accountNumber: input.accountNumber.trim(),
    accountHolderName: input.accountHolderName?.trim() || null,
    notes: input.notes?.trim() || null,
    isPrimary: input.isPrimary === true,
    company: {
      razonSocial: c?.razonSocial?.trim() || displayName,
      nombreFantasia: c?.nombreFantasia?.trim() || null,
      rut: c?.rut?.trim() || null,
      businessActivity: c?.businessActivity?.trim() || null,
      logoBase64,
    },
    branchName: posCtx?.branchName?.trim() || null,
    pointOfSaleName: posCtx?.pointOfSaleName?.trim() || null,
    paymentMethodLabel: input.paymentMethodLabel?.trim() || null,
    issuedAt: new Date().toISOString(),
  };
}

/** Solo impresora ticket vía KaiPrinters (sin fallback documento). */
export async function printBankAccountTicketAgent(
  input: BankAccountTicketPrintInput,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (typeof window === "undefined") {
    return { ok: false, message: "Impresión no disponible." };
  }
  if (!isPosAgentPrintConfiguredForPurpose("tickets")) {
    return {
      ok: false,
      message: "Configure KaiPrinters y el alias de impresora Tickets en el POS.",
    };
  }

  const logoBase64 = await fetchReceiptLogoBase64(
    input.company?.logoUrl,
    window.location.origin,
  );
  const ticket = toTicketPayload(input, logoBase64);
  const meta = bankAccountPrintMeta(input.accountKey);
  let enqueued = false;

  try {
    await withPrintAgentConnection("tickets", async (conn, hello) => {
      if (!agentSupportsPosBankAccountTicket(hello)) {
        throw new Error("agent_no_pos_bank_account_ticket");
      }
      const jobId = await enqueueVectorTicketAndAwaitDelivery(
        conn,
        async () => {
          const res = (await conn.enqueuePosBankAccountTicket(ticket, {
            ...meta,
            sourceApp: "pwa-pos",
          })) as { jobId?: string; queued?: boolean };
          if (res && res.queued === false && !res.jobId) {
            throw new Error("enqueue_rejected");
          }
          return res;
        },
        async () => {
          const res = (await conn.enqueuePosBankAccountTicket(
            ticket,
            { ...meta, sourceApp: "pwa-pos" },
            true,
          )) as { jobId?: string; queued?: boolean };
          if (res && res.queued === false && !res.jobId) {
            throw new Error("enqueue_rejected");
          }
          return res;
        },
      );
      enqueued = Boolean(jobId);
    });
  } catch (e) {
    console.warn("[KaiStore print] cuenta bancaria agente:", e);
    const msg =
      e instanceof Error && e.message.trim()
        ? e.message.trim()
        : "No se pudo imprimir en KaiPrinters.";
    return { ok: false, message: msg };
  }

  if (!enqueued) {
    return {
      ok: false,
      message: "KaiPrinters no encoló el ticket. Verifique la impresora Tickets.",
    };
  }
  return { ok: true };
}

export function findCompanyBankAccount(
  company: CompanyDetails | null,
  accountKey: string,
): CompanyDetails["bankAccounts"][number] | null {
  const key = accountKey.trim();
  if (!key || !company?.bankAccounts?.length) return null;
  return (
    company.bankAccounts.find((a) => (a.accountKey?.trim() || "") === key) ?? null
  );
}
