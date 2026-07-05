/** Pie estándar de tickets térmicos — paridad con [FOOTER-Y-BARCODE.md] y Tauri ESC/POS. */

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

/** `{folio} · {fecha/hora}` centrado bajo el barcode. */
export function ticketFooterFolioDateHtml(folio: string, issuedAtIso: string): string {
  const f = folio.trim();
  const dt = formatTicketFooterDateTime(issuedAtIso);
  if (!f && !dt) return "";
  const line = f && dt ? `${f} · ${dt}` : f || dt;
  return `<p class="center muted footer-folio">${escapeHtml(line)}</p>`;
}

export function ticketClosingMessageHtml(message?: string | null): string {
  const m = message?.trim();
  if (!m) return "";
  return `<p class="center closing-msg">${escapeHtml(m)}</p>`;
}

/** Font B visual (10px) — `Operador: {nombre}`. */
export function ticketOperatorHtml(operatorName?: string | null): string {
  const n = operatorName?.trim();
  if (!n) return "";
  return `<p class="center operator-line" style="font-size:10px;margin-top:4px;">Operador: ${escapeHtml(n)}</p>`;
}

/** @deprecated Use {@link ticketOperatorHtml} */
export const ticketAttendedByHtml = ticketOperatorHtml;

export function resolvePosOperatorDisplayName(user: {
  name?: string | null;
  email?: string | null;
  userName?: string | null;
} | null | undefined): string | null {
  if (!user) return null;
  const name =
    user.name?.trim() ||
    user.userName?.trim() ||
    user.email?.trim() ||
    null;
  return name || null;
}
