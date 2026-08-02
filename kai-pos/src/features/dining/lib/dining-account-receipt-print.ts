import type { DiningAccountTicketPrintInput } from "@/features/dining/lib/dining-account-ticket-agent";
import { thermalReceiptCssForFormat } from "@/features/pos-print/lib/thermal-receipt-ticket-styles";
import { readPosContextClient } from "@/features/session/lib/pos-context-storage";
import {
  escapeHtml,
  formatDateTimeEs,
  formatMoneyClp,
  resolveReceiptLogoUrl,
} from "@/features/cash-closing/lib/cash-closing-print-format";
import {
  POS_DINING_ACCOUNT_TICKET_FOOTER_NOTE,
  type PrintFormat,
} from "@kai/print-service-client";

function kindLabel(kind: string): string {
  switch (kind.trim().toUpperCase()) {
    case "TABLE":
      return "Mesa";
    case "COUNTER":
      return "Barra";
    case "TAKEAWAY":
      return "Para llevar";
    default:
      return "Cuenta";
  }
}

function formatQty(qty: number): string {
  if (Math.abs(qty % 1) < 0.001) return String(Math.round(qty));
  return qty.toFixed(2);
}

/** HTML térmico 80 mm de pre-cuenta dining (fallback diálogo del navegador). */
export function buildDiningAccountTicketHtml(
  input: DiningAccountTicketPrintInput,
  origin: string,
  format: PrintFormat = "ticket_80mm",
): string {
  const c = input.company;
  const logo = resolveReceiptLogoUrl(c?.logoUrl, origin);
  const displayName =
    c?.nombreFantasia?.trim() || c?.razonSocial?.trim() || "Empresa";
  const posCtx = readPosContextClient();
  const branchName = posCtx?.branchName?.trim() || null;
  const pointOfSaleName = posCtx?.pointOfSaleName?.trim() || null;
  const issuedAt = new Date().toISOString();

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
  const totalWithTip =
    tipSuggestedAmount != null ? total + tipSuggestedAmount : null;

  const lineRows = lines
    .map((l) => {
      const notes = l.notes
        ? `<div class="muted">* ${escapeHtml(l.notes)}</div>`
        : "";
      return `<tr>
        <td class="line-block">
          <div class="line-name">${escapeHtml(l.name)}</div>
          <div class="line-detail">
            <span class="line-qty">${escapeHtml(formatQty(l.quantity))} × ${escapeHtml(formatMoneyClp(l.unitPrice))}</span>
            <span class="line-total">${escapeHtml(formatMoneyClp(l.lineTotal))}</span>
          </div>
          ${notes}
        </td>
      </tr>`;
    })
    .join("");

  const tableCode = input.tableCode?.trim();

  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/>
<title>Cuenta ${escapeHtml(input.displayLabel.trim() || "cuenta")}</title>
<style>${thermalReceiptCssForFormat(format)}</style></head><body>
<div class="receipt">
  ${logo ? `<img class="logo" src="${escapeHtml(logo)}" alt="" />` : ""}
  <p class="store">${escapeHtml(displayName)}</p>
  ${c?.rut?.trim() ? `<p class="legal">RUT: ${escapeHtml(c.rut.trim())}</p>` : ""}
  <div class="sep"></div>
  <p class="center" style="font-size:12px;font-weight:600;">CUENTA</p>
  <div class="row"><span>Cuenta</span><span class="tright">${escapeHtml(input.displayLabel.trim() || "Cuenta")}</span></div>
  ${tableCode ? `<div class="row"><span>Mesa</span><span class="tright">${escapeHtml(tableCode)}</span></div>` : ""}
  <div class="row"><span>Tipo</span><span class="tright">${escapeHtml(kindLabel(input.kind))}</span></div>
  ${branchName ? `<div class="row"><span>Sucursal</span><span class="tright">${escapeHtml(branchName)}</span></div>` : ""}
  ${pointOfSaleName ? `<div class="row"><span>Punto de venta</span><span class="tright">${escapeHtml(pointOfSaleName)}</span></div>` : ""}
  <div class="row"><span>Emitido</span><span class="tright">${escapeHtml(formatDateTimeEs(issuedAt))}</span></div>
  <div class="sep"></div>
  <div class="section-title" style="text-transform:none">DETALLE</div>
  <table class="lines" role="presentation">${lineRows}</table>
  <div class="sep"></div>
  <div class="row tot"><span>TOTAL</span><span>${escapeHtml(formatMoneyClp(total))}</span></div>
  ${
    tipSuggestedAmount != null
      ? `<div class="row"><span>Propina sugerida${
          tipSuggestPercent != null ? ` (${tipSuggestPercent}%)` : ""
        }</span><span class="tright">${escapeHtml(formatMoneyClp(tipSuggestedAmount))}</span></div>
  <div class="row"><span>Total c/ propina (info)</span><span class="tright">${escapeHtml(formatMoneyClp(totalWithTip ?? 0))}</span></div>
  <p class="center muted" style="font-size:10px">La propina no forma parte de la boleta</p>`
      : ""
  }
  <div class="sep"></div>
  <p class="center muted">${escapeHtml(POS_DINING_ACCOUNT_TICKET_FOOTER_NOTE)}</p>
</div>
</body></html>`;
}
