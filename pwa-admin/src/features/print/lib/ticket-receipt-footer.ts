/** Pie estándar de tickets térmicos — paridad con Tauri ESC/POS. */

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function formatTicketFooterDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export function ticketFooterFolioDateHtml(folio: string, issuedAtIso: string): string {
  const f = folio.trim();
  const dt = formatTicketFooterDateTime(issuedAtIso);
  if (!f && !dt) return "";
  const line = f && dt ? `${f} · ${dt}` : f || dt;
  return `<p class="center muted footer-folio">${escapeHtml(line)}</p>`;
}

export function ticketOperatorHtml(operatorName?: string | null): string {
  const n = operatorName?.trim();
  if (!n) return "";
  return `<p class="center operator-line" style="font-size:10px;margin-top:4px;">Operador: ${escapeHtml(n)}</p>`;
}

/** @deprecated Use {@link ticketOperatorHtml} */
export const ticketAttendedByHtml = ticketOperatorHtml;
