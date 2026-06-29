"use client";

import type { PresaleTicketDetail } from "../types/presale-ticket.types";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** HTML de respaldo (navegador / fallback documento). */
export function buildPresaleTicketHtml(
  ticket: PresaleTicketDetail,
  companyName?: string | null,
): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Ticket ${escapeHtml(ticket.code)}</title>
<style>
body{font-family:system-ui,sans-serif;max-width:320px;margin:24px auto;text-align:center}
h1{font-size:1.25rem;margin:0 0 8px}
.code{font-family:monospace;font-size:1.1rem;font-weight:700;letter-spacing:.05em;word-break:break-all;margin:16px 0}
.qr{font-size:.85rem;color:#444;margin-bottom:16px}
.total{font-size:1.1rem;font-weight:600}
</style></head><body>
<p>${escapeHtml(companyName?.trim() || "Preventa")}</p>
<h1>Ticket de preventa</h1>
<p class="code">${escapeHtml(ticket.code)}</p>
<p class="qr">Presenta este código en caja</p>
<p class="total">Total: ${new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(Math.round(ticket.total))}</p>
<p style="font-size:.75rem;color:#666">${escapeHtml(ticket.pointOfSaleName || "")} · ${escapeHtml(ticket.branchName || "")}</p>
<script>window.onload=function(){window.print();}</script>
</body></html>`;
}

/** Impresión HTML de respaldo en ventana del navegador. */
export function printPresaleTicketHtml(ticket: PresaleTicketDetail, companyName?: string | null) {
  const html = buildPresaleTicketHtml(ticket, companyName);
  const w = window.open("", "_blank", "noopener,noreferrer,width=400,height=600");
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  return true;
}
