import { thermalReceiptTicketCss } from "@/features/print/lib/thermal-receipt-ticket-styles";
import { receiptBarcodeSvgString } from "@/lib/receipt-barcode";
import type { PaymentInPrintData } from "./payment-in-print.types";
import {
  ticketOperatorHtml,
  ticketFooterFolioDateHtml,
} from "@/features/print/lib/ticket-receipt-footer";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatMoney(n: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function resolveReceiptLogoUrl(logoUrl: string | null | undefined, origin: string): string {
  const appDefault = `${origin}/logo.png`;
  const raw = logoUrl?.trim();
  if (!raw) return appDefault;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("/")) return `${origin}${raw}`;
  return raw;
}

/** Ticket térmico 80 mm (fallback navegador). */
export function buildPaymentInTicketHtml(data: PaymentInPrintData, origin: string): string {
  const logo = resolveReceiptLogoUrl(data.company.logoUrl, origin);
  const displayName = data.company.nombreFantasia?.trim() || data.company.razonSocial.trim();

  const payRows = data.payments
    .map((p) => {
      const det = p.detail
        ? `<div class="muted" style="margin-top:2px;">${escapeHtml(p.detail)}</div>`
        : "";
      return `<div class="row"><span>${escapeHtml(p.label)}</span><span>${formatMoney(p.amount)}</span></div>${det}`;
    })
    .join("");

  const allocRows =
    data.allocations.length > 0
      ? data.allocations
          .map(
            (a) =>
              `<div class="row"><span class="mono">${escapeHtml(a.documentNumber)}</span><span>${formatMoney(a.amount)}</span></div>`,
          )
          .join("")
      : "";

  const customerBlock = data.customer
    ? `<div class="section">
        <div class="section-title">Cliente</div>
        <div>${escapeHtml(data.customer.name)}</div>
        ${data.customer.document ? `<div class="muted">${escapeHtml(data.customer.document)}</div>` : ""}
      </div>`
    : "";

  const originBits = [data.branchName, data.pointOfSaleName].filter(Boolean).join(" · ");
  const barcodeSvg = receiptBarcodeSvgString(data.folio);

  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/>
<title>Cobro ${escapeHtml(data.folio)}</title>
<style>${thermalReceiptTicketCss()}</style></head><body>
<div class="ticket">
  <div class="center"><img src="${escapeHtml(logo)}" alt="" class="logo" /></div>
  <div class="center store">${escapeHtml(displayName)}</div>
  ${data.company.rut ? `<div class="center muted">RUT: ${escapeHtml(data.company.rut)}</div>` : ""}
  <div class="divider"></div>
  <div class="center heading">COMPROBANTE DE PAGO</div>
  ${originBits ? `<div class="row"><span>Origen</span><span class="tright">${escapeHtml(originBits)}</span></div>` : ""}
  ${customerBlock}
  <div class="section">
    <div class="section-title">Medios de pago</div>
    ${payRows || '<div class="muted">—</div>'}
  </div>
  ${
    allocRows
      ? `<div class="section">
    <div class="section-title">Aplicado a ventas</div>
    ${allocRows}
  </div>`
      : ""
  }
  <div class="divider"></div>
  <div class="row total"><span>Total cobrado</span><span>${formatMoney(data.totalCollected)}</span></div>
  <div class="row"><span>Registrado pagado</span><span>${formatMoney(data.amountPaid)}</span></div>
  ${data.externalReference ? `<div class="muted center">Ref: ${escapeHtml(data.externalReference)}</div>` : ""}
  ${data.notes ? `<div class="section"><div class="section-title">Notas</div><div>${escapeHtml(data.notes)}</div></div>` : ""}
  <div class="divider"></div>
  ${barcodeSvg ? `<div class="barcode center">${barcodeSvg}</div>` : ""}
  ${ticketFooterFolioDateHtml(data.folio, data.issuedAtIso)}
  ${ticketOperatorHtml(data.operatorName)}
</div>
</body></html>`;
}
