import {
  getPosDocumentPrintFormat,
  isDocumentPrintFormat,
  type PrintFormat,
} from "@flowstore/print-service-client";
import type { CashSessionOpeningPrintInput } from "@/features/cash-session-opening/lib/cash-session-opening-print.types";
import {
  escapeHtml,
  formatDateTimeEs,
  formatMoneyClp,
  resolveReceiptLogoUrl,
} from "@/features/cash-closing/lib/cash-closing-print-format";
import { printCashSessionOpeningTicketVector } from "@/features/cash-session-opening/lib/cash-session-opening-ticket-agent";
import { printPosHtmlViaAgentOrBrowser } from "@/features/pos-print/lib/pos-agent-print";
import { documentPageAtRule } from "@/features/pos-print/lib/document-print-format";
import { thermalReceiptCssForFormat } from "@/features/pos-print/lib/thermal-receipt-ticket-styles";

function buildHeaderMeta(input: CashSessionOpeningPrintInput): string {
  const originLabel = [input.branchName?.trim(), input.pointOfSaleName?.trim()]
    .filter(Boolean)
    .map((x) => escapeHtml(String(x)))
    .join(" · ");
  const c = input.company;
  const displayName = c?.nombreFantasia?.trim() || c?.razonSocial?.trim() || "Empresa";
  const rut = c?.rut?.trim();
  return `
  ${originLabel ? `<div class="row"><span>Sucursal / POS</span><span class="tright">${originLabel}</span></div>` : ""}
  ${input.operatorName?.trim() ? `<div class="row"><span>Operador</span><span class="tright">${escapeHtml(input.operatorName.trim())}</span></div>` : ""}
  <div class="row"><span>Sesión</span><span class="tright">${escapeHtml(input.cashSessionId.slice(0, 8).toUpperCase())}</span></div>
  <div class="row"><span>Apertura</span><span>${formatDateTimeEs(input.openedAt)}</span></div>
  ${input.cashHubName?.trim() ? `<div class="row"><span>Centro efectivo</span><span class="tright">${escapeHtml(input.cashHubName.trim())}</span></div>` : ""}
  <p class="legal center muted">${escapeHtml(displayName)}${rut ? ` · RUT ${escapeHtml(rut)}` : ""}</p>`;
}

function buildOpeningAmountBlock(input: CashSessionOpeningPrintInput): string {
  return `<div class="row total"><span>Monto de apertura</span><span>${escapeHtml(formatMoneyClp(input.openingAmount))}</span></div>`;
}

export function buildCashSessionOpeningTicketHtml(
  input: CashSessionOpeningPrintInput,
  origin: string,
  format: PrintFormat = "ticket_80mm",
): string {
  const logo = resolveReceiptLogoUrl(input.company?.logoUrl, origin);
  const displayName =
    input.company?.nombreFantasia?.trim() || input.company?.razonSocial?.trim() || "Empresa";

  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/><title>Apertura de caja</title>
<style>
${thermalReceiptCssForFormat(format)}
.bold { font-weight: 600; }
</style></head><body>
<div class="receipt">
  <img class="logo" src="${escapeHtml(logo)}" alt="" />
  <p class="store">${escapeHtml(displayName)}</p>
  <div class="sep"></div>
  <p class="center bold">APERTURA DE CAJA</p>
  <p class="center muted">Inicio de sesión</p>
  <div class="sep"></div>
  ${buildHeaderMeta(input)}
  <div class="sep"></div>
  ${buildOpeningAmountBlock(input)}
  <div class="sep"></div>
  <p class="center muted">Sesión de caja abierta</p>
</div>
</body></html>`;
}

const OPENING_DOC_CSS_BASE = `
  body { font-family: system-ui, sans-serif; font-size: 12pt; color: #111; margin: 0; }
  h1 { font-size: 18pt; margin: 0 0 6px; }
  .muted { color: #555; font-size: 10pt; }
  .meta { margin: 14px 0 20px; }
  .meta p { margin: 4px 0; }
  .amount { font-size: 16pt; font-weight: 700; margin: 24px 0; }
`;

export function buildCashSessionOpeningDocumentHtml(
  input: CashSessionOpeningPrintInput,
  format: PrintFormat = "document_a4",
): string {
  const c = input.company;
  const displayName = c?.nombreFantasia?.trim() || c?.razonSocial?.trim() || "";
  const razonSocial = c?.razonSocial?.trim() || "";

  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/><title>Apertura de caja</title>
<style>
  ${documentPageAtRule(format)}
  ${OPENING_DOC_CSS_BASE}
</style></head><body>
  <h1>Apertura de caja</h1>
  <p class="muted">Comprobante de inicio de sesión</p>
  ${displayName ? `<p><strong>${escapeHtml(displayName)}</strong></p>` : ""}
  ${razonSocial && razonSocial !== displayName ? `<p class="muted">${escapeHtml(razonSocial)}</p>` : ""}
  <div class="meta">
    ${input.branchName?.trim() ? `<p><strong>Sucursal:</strong> ${escapeHtml(input.branchName.trim())}</p>` : ""}
    ${input.pointOfSaleName?.trim() ? `<p><strong>Punto de venta:</strong> ${escapeHtml(input.pointOfSaleName.trim())}</p>` : ""}
    ${input.operatorName?.trim() ? `<p><strong>Operador:</strong> ${escapeHtml(input.operatorName.trim())}</p>` : ""}
    <p><strong>Sesión:</strong> ${escapeHtml(input.cashSessionId)}</p>
    <p><strong>Fecha apertura:</strong> ${formatDateTimeEs(input.openedAt)}</p>
    ${input.cashHubName?.trim() ? `<p><strong>Centro de efectivo:</strong> ${escapeHtml(input.cashHubName.trim())}</p>` : ""}
  </div>
  <p class="amount">Monto de apertura: ${escapeHtml(formatMoneyClp(input.openingAmount))}</p>
</body></html>`;
}

function printMeta(input: CashSessionOpeningPrintInput, format: PrintFormat) {
  const ref = input.cashSessionId.trim().slice(0, 8).toUpperCase() || "apertura";
  return {
    filename: `apertura-caja-${ref}.pdf`,
    iframeTitle: "Apertura de caja",
    documentType: "CASH_SESSION_OPEN",
    internalFolio: ref,
    format,
  };
}

export async function printCashSessionOpeningAwait(
  input: CashSessionOpeningPrintInput,
  format?: PrintFormat,
): Promise<"agent" | "browser"> {
  if (typeof window === "undefined") return "browser";
  const resolved = format ?? getPosDocumentPrintFormat("cashSessionOpening");
  const meta = printMeta(input, resolved);
  if (!isDocumentPrintFormat(resolved)) {
    return printCashSessionOpeningTicketVector(input, resolved);
  }
  return printPosHtmlViaAgentOrBrowser(
    buildCashSessionOpeningDocumentHtml(input, resolved),
    "documents",
    meta,
  );
}

export function printCashSessionOpening(input: CashSessionOpeningPrintInput): void {
  void printCashSessionOpeningAwait(input);
}
