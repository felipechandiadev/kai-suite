import type { CloseSessionCountedPayload } from "@/features/session/lib/close-counted-buckets";

export function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function formatMoneyClp(amount: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Math.round(Number.isFinite(amount) ? amount : 0));
}

export function formatDateTimeEs(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "—";
  }
}

export const COUNTED_BUCKET_ROWS: { key: keyof CloseSessionCountedPayload; label: string }[] = [
  { key: "cash", label: "Efectivo" },
  { key: "debitCard", label: "Tarjeta débito" },
  { key: "creditCard", label: "Tarjeta crédito" },
  { key: "transfer", label: "Transferencia" },
  { key: "check", label: "Cheque" },
  { key: "other", label: "Otros" },
];

export function normalizeCloseCounted(
  raw: CloseSessionCountedPayload | Record<string, number> | undefined,
): CloseSessionCountedPayload {
  const c = raw ?? {};
  return {
    cash: Math.round(Number(c.cash ?? 0)),
    debitCard: Math.round(Number(c.debitCard ?? 0)),
    creditCard: Math.round(Number(c.creditCard ?? 0)),
    transfer: Math.round(Number(c.transfer ?? 0)),
    check: Math.round(Number(c.check ?? 0)),
    other: Math.round(Number(c.other ?? 0)),
  };
}

export function resolveReceiptLogoUrl(companyLogoUrl: string | null | undefined, origin: string): string {
  const appDefault = `${origin}/logo.png`;
  const raw = companyLogoUrl?.trim();
  if (!raw) return appDefault;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("/")) return `${origin}${raw}`;
  return raw;
}
