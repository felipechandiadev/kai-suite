import type { CompanyDetails } from "@/features/company/infrastructure/company.request";
import { thermalReceiptCssForFormat } from "@/features/pos-print/lib/thermal-receipt-ticket-styles";
import { readPosContextClient } from "@/features/session/lib/pos-context-storage";
import {
  escapeHtml,
  formatDateTimeEs,
  formatMoneyClp,
  resolveReceiptLogoUrl,
} from "@/features/cash-closing/lib/cash-closing-print-format";
import {
  POS_LAUNDRY_RECEPTION_TICKET_FOOTER_NOTE,
  type PrintFormat,
} from "@kai/print-service-client";
import type { LaundryReceptionTicketPrintInput } from "./laundry-reception-ticket-agent";

function formatQty(qty: number): string {
  if (Math.abs(qty % 1) < 0.001) return String(Math.round(qty));
  return qty.toFixed(2);
}

/** HTML térmico 80 mm guía recepción lavandería (fallback navegador). */
export function buildLaundryReceptionTicketHtml(
  input: LaundryReceptionTicketPrintInput,
  origin: string,
  format: PrintFormat = "ticket_80mm",
): string {
  const c = input.company;
  const logo = resolveReceiptLogoUrl(c?.logoUrl, origin);
  const displayName =
    c?.nombreFantasia?.trim() || c?.razonSocial?.trim() || "Empresa";
  const posCtx = readPosContextClient();
  const branchName = input.branchName?.trim() || posCtx?.branchName?.trim() || null;
  const pointOfSaleName =
    input.pointOfSaleName?.trim() || posCtx?.pointOfSaleName?.trim() || null;
  const issuedAt = input.issuedAt || new Date().toISOString();

  const garmentBlocks = input.garments
    .map((g) => {
      const services = g.services
        .map((s) => {
          return `<div class="line-detail">
            <span class="line-name">${escapeHtml(s.name)}</span>
            <span class="line-qty">${escapeHtml(formatQty(s.quantity))} × ${escapeHtml(formatMoneyClp(s.unitPrice))}</span>
            <span class="line-total">${escapeHtml(formatMoneyClp(s.lineTotal))}</span>
          </div>`;
        })
        .join("");
      const care = g.careInstructions?.trim()
        ? `<div class="muted">${escapeHtml(g.careInstructions.trim())}</div>`
        : "";
      return `<div class="garment-block">
        <div class="section-title" style="text-transform:none">${escapeHtml(g.label)} × ${escapeHtml(formatQty(g.quantity))}</div>
        ${care}
        ${services}
      </div>`;
    })
    .join('<div class="sep thin"></div>');

  const deposit =
    input.totals.depositPaid != null && input.totals.depositPaid > 0
      ? `<div class="row"><span>Abono</span><span>${escapeHtml(formatMoneyClp(input.totals.depositPaid))}</span></div>`
      : "";
  const balance =
    input.totals.balanceDue != null && input.totals.balanceDue > 0
      ? `<div class="row"><span>Saldo</span><span>${escapeHtml(formatMoneyClp(input.totals.balanceDue))}</span></div>`
      : "";

  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/>
<title>Guía ${escapeHtml(input.code.trim() || "lavandería")}</title>
<style>${thermalReceiptCssForFormat(format)}
.garment-block{margin:6px 0}
.line-detail{display:flex;flex-wrap:wrap;gap:4px;font-size:11px;margin:2px 0}
.line-name{flex:1 1 100%;font-weight:600}
.sep.thin{margin:4px 0}
</style></head><body>
<div class="receipt">
  ${logo ? `<img class="logo" src="${escapeHtml(logo)}" alt="" />` : ""}
  <p class="store">${escapeHtml(displayName)}</p>
  ${c?.rut?.trim() ? `<p class="legal">RUT: ${escapeHtml(c.rut.trim())}</p>` : ""}
  <div class="sep"></div>
  <p class="center" style="font-size:12px;font-weight:600;">GUÍA DE RECEPCIÓN</p>
  <div class="row"><span>Código</span><span class="tright">${escapeHtml(input.code.trim() || "—")}</span></div>
  <div class="row"><span>Cliente</span><span class="tright">${escapeHtml(input.customerName.trim() || "Cliente")}</span></div>
  ${input.customerPhone?.trim() ? `<div class="row"><span>Teléfono</span><span class="tright">${escapeHtml(input.customerPhone.trim())}</span></div>` : ""}
  ${branchName ? `<div class="row"><span>Sucursal</span><span class="tright">${escapeHtml(branchName)}</span></div>` : ""}
  ${pointOfSaleName ? `<div class="row"><span>Punto de venta</span><span class="tright">${escapeHtml(pointOfSaleName)}</span></div>` : ""}
  <div class="row"><span>Emitido</span><span class="tright">${escapeHtml(formatDateTimeEs(issuedAt))}</span></div>
  ${input.promisedAt?.trim() ? `<div class="row"><span>Prometido</span><span class="tright">${escapeHtml(formatDateTimeEs(input.promisedAt))}</span></div>` : ""}
  <div class="row"><span>Pago</span><span class="tright">${escapeHtml(input.paymentModeLabel.trim())}</span></div>
  <div class="sep"></div>
  ${garmentBlocks}
  <div class="sep"></div>
  <div class="row tot"><span>TOTAL SERVICIOS</span><span>${escapeHtml(formatMoneyClp(input.totals.servicesTotal))}</span></div>
  ${deposit}
  ${balance}
  <div class="sep"></div>
  <p class="center muted" style="font-size:10px">${escapeHtml(input.footerNote || POS_LAUNDRY_RECEPTION_TICKET_FOOTER_NOTE)}</p>
  ${input.operatorName?.trim() ? `<p class="center muted" style="font-size:10px">Atendido por: ${escapeHtml(input.operatorName.trim())}</p>` : ""}
</div></body></html>`;
}
