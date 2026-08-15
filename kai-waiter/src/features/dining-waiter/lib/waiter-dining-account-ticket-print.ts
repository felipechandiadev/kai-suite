"use client";

import {
  agentSupportsPosDiningAccountTicket,
  buildWebSocketUrl,
  humanizePrintAgentError,
  POS_DINING_ACCOUNT_TICKET_FOOTER_NOTE,
  POS_DINING_ACCOUNT_TICKET_PAYLOAD_VERSION,
  printServicePageRequiresTls,
  PrintServiceConnection,
  readPrintServiceConfigFromStorage,
  readWaiterTicketsPrinterAlias,
  resetSharedPrintServiceConnections,
  writePrintServiceConfigToStorage,
  type HelloResponseData,
  type PosDiningAccountTicketPayload,
  type PrintAgentCatalogItem,
} from "@kai/print-service-client";

export type WaiterDiningAccountTicketLine = {
  name: string;
  quantity: number;
  unitPrice: number;
  notes?: string | null;
};

export type WaiterDiningAccountTicketInput = {
  orderId: string;
  displayLabel: string;
  tableCode?: string | null;
  kind: string;
  status: string;
  lines: WaiterDiningAccountTicketLine[];
  companyName?: string | null;
  branchName?: string | null;
  tipSuggestPercent?: number | null;
  tipSuggestedAmount?: number | null;
  printAgents?: PrintAgentCatalogItem[];
};

function extractJobId(res: unknown): string | null {
  if (!res || typeof res !== "object") return null;
  const jobId = (res as { jobId?: unknown }).jobId;
  return typeof jobId === "string" && jobId.trim() ? jobId.trim() : null;
}

function buildPayload(
  input: WaiterDiningAccountTicketInput,
): PosDiningAccountTicketPayload {
  const displayName = input.companyName?.trim() || "Empresa";
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
  const tipSuggestedAmount =
    input.tipSuggestedAmount != null && input.tipSuggestedAmount > 0
      ? Math.round(input.tipSuggestedAmount)
      : null;
  const tipSuggestPercent =
    tipSuggestedAmount != null && input.tipSuggestPercent != null
      ? Number(input.tipSuggestPercent)
      : null;
  return {
    version: POS_DINING_ACCOUNT_TICKET_PAYLOAD_VERSION,
    company: {
      razonSocial: displayName,
      nombreFantasia: displayName,
      rut: null,
      businessActivity: null,
      logoBase64: null,
    },
    account: {
      displayLabel: input.displayLabel.trim() || "Cuenta",
      tableCode: input.tableCode?.trim() || null,
      kind: input.kind.trim() || "TABLE",
      status: input.status.trim() || "BILLING",
    },
    branchName: input.branchName?.trim() || null,
    pointOfSaleName: null,
    issuedAt: new Date().toISOString(),
    lines,
    totals: {
      total,
      tipSuggestedAmount,
      tipSuggestPercent,
      totalWithTip:
        tipSuggestedAmount != null ? total + tipSuggestedAmount : null,
    },
    footerNote: POS_DINING_ACCOUNT_TICKET_FOOTER_NOTE,
  };
}

function toPrintError(e: unknown, hostHint: string): Error {
  const raw = e instanceof Error ? e.message : String(e);
  const human = humanizePrintAgentError(raw);
  if (
    raw.toLowerCase().includes("closed_before_open") ||
    raw.toLowerCase().includes("open_timeout") ||
    raw.toLowerCase().includes("not_started")
  ) {
    return new Error(
      `${human} Revisá Impresión: host ${hostHint || "?"} y que Kai Printers esté en línea.`,
    );
  }
  if (raw.includes("agent_no_pos_dining_account_ticket")) {
    return new Error(
      "El agente no soporta tickets de cuenta. Actualizá Kai Printers.",
    );
  }
  return new Error(human !== raw ? human : raw);
}

function resolveWaiterAccountAgent(
  agents: PrintAgentCatalogItem[] | undefined,
): PrintAgentCatalogItem | null {
  const cfg = readPrintServiceConfigFromStorage();
  const agentId = cfg.agentId?.trim();
  if (agentId && agents?.length) {
    const found = agents.find((a) => a.id === agentId);
    if (found) return found;
  }
  return null;
}

async function withWaiterTicketsConnection(
  agent: PrintAgentCatalogItem | null,
  fn: (
    conn: PrintServiceConnection,
    hello: HelloResponseData | null,
  ) => Promise<void>,
): Promise<{ host: string }> {
  const cfg = readPrintServiceConfigFromStorage();
  const host = agent?.lanHost?.trim() || cfg.host.trim();
  if (!host) {
    throw new Error(
      "Configurá el agente de impresión en Impresión (menú superior)",
    );
  }
  const tls = printServicePageRequiresTls();
  const port = tls
    ? (agent?.wssPort ?? cfg.wssPort ?? 14568)
    : (agent?.wsPort ?? cfg.port ?? 14567);
  const conn = new PrintServiceConnection({
    url: buildWebSocketUrl(host, port, tls),
    clientId: "kai-waiter-account-print",
    appLabel: "Kai Waiter",
    requiredPurposes: ["tickets"],
  });
  conn.connect();
  try {
    await conn.waitForOpen(15_000);
    try {
      await conn.waitForHello(10_000);
    } catch {
      /* hello opcional */
    }
    await fn(conn, conn.getHelloPayload());
  } finally {
    conn.disconnect({ ifConnecting: "abandon" });
  }
  return { host };
}

async function enqueueOnConn(
  conn: PrintServiceConnection,
  hello: HelloResponseData | null,
  ticket: PosDiningAccountTicketPayload,
  meta: {
    filename: string;
    documentType: string;
    internalFolio: string;
    format: "ticket_80mm";
    purpose: "tickets";
    sourceApp: string;
    printerDisplayLabel?: string | null;
  },
): Promise<void> {
  if (hello != null && !agentSupportsPosDiningAccountTicket(hello)) {
    throw new Error("agent_no_pos_dining_account_ticket");
  }
  const hasAlias = Boolean(meta.printerDisplayLabel?.trim());
  const attempts = hasAlias ? [false, true] : [true, false];
  let lastError: unknown = null;
  for (const omitLabel of attempts) {
    try {
      const res = (await conn.enqueuePosDiningAccountTicket(
        ticket,
        meta,
        omitLabel,
      )) as { jobId?: string; queued?: boolean };
      if (res && res.queued === false && !res.jobId) {
        throw new Error("enqueue_rejected");
      }
      const jobId = extractJobId(res);
      if (jobId) {
        const delivery = await conn.waitForPrintJob(jobId, {
          timeoutMs: 60_000,
          awaitUntil: "spooled",
        });
        if (delivery.status === "failed") {
          throw new Error(delivery.error || "print_failed");
        }
      }
      return;
    } catch (e) {
      lastError = e;
      if (String(e).includes("unknown_printer_display_label")) continue;
      throw e;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("No se pudo imprimir la cuenta en el agente");
}

/**
 * Imprime la pre-cuenta dining en el agente Kai Printers elegido en /impresion
 * (conexión dedicada + alias de tickets).
 */
export async function printWaiterDiningAccountTicket(
  input: WaiterDiningAccountTicketInput,
): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("La impresión solo está disponible en el dispositivo");
  }
  if (input.lines.length === 0) {
    throw new Error("La cuenta no tiene ítems para imprimir");
  }

  const cfg = readPrintServiceConfigFromStorage();
  if (!printServicePageRequiresTls() && cfg.useTls) {
    writePrintServiceConfigToStorage({ ...cfg, useTls: false });
    resetSharedPrintServiceConnections();
  }

  const agent = resolveWaiterAccountAgent(input.printAgents);
  const hostHint = agent?.lanHost?.trim() || cfg.host.trim();
  if (!hostHint) {
    throw new Error(
      "Configurá el agente de impresión en Impresión (menú superior)",
    );
  }

  const ticket = buildPayload(input);
  const ref =
    input.orderId.trim().slice(0, 12).replace(/[^\w-]+/g, "-") || "cuenta";
  const meta = {
    filename: `cuenta-dining-${ref}.escpos`,
    documentType: "DINING_ACCOUNT",
    internalFolio: ref,
    format: "ticket_80mm" as const,
    purpose: "tickets" as const,
    sourceApp: "kai-waiter",
    printerDisplayLabel: readWaiterTicketsPrinterAlias() || null,
  };

  try {
    await withWaiterTicketsConnection(agent, async (conn, hello) => {
      await enqueueOnConn(conn, hello, ticket, meta);
    });
  } catch (e) {
    throw toPrintError(e, hostHint);
  }
}
