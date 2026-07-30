export type PosNcPayoutRow = {
  id: string;
  documentNumber: string;
  availableAmount: number;
};

export type PosNcPayoutDraft = {
  customerId: string;
  customerDisplayName: string | null;
  creditNotes: PosNcPayoutRow[];
};

const STORAGE_KEY = "pos_nc_payout_v1";

export function writePosNcPayoutDraft(draft: PosNcPayoutDraft): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
}

export function readPosNcPayoutDraft(): PosNcPayoutDraft | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PosNcPayoutDraft;
    if (!parsed?.customerId?.trim() || !Array.isArray(parsed.creditNotes)) return null;
    const creditNotes = parsed.creditNotes
      .filter((n) => n?.id?.trim() && (Number(n.availableAmount) || 0) > 0)
      .map((n) => ({
        id: n.id.trim(),
        documentNumber: n.documentNumber?.trim() ? n.documentNumber.trim() : n.id.trim(),
        availableAmount: Math.round(Number(n.availableAmount) || 0),
      }));
    if (creditNotes.length === 0) return null;
    return {
      customerId: parsed.customerId.trim(),
      customerDisplayName: parsed.customerDisplayName?.trim() || null,
      creditNotes,
    };
  } catch {
    return null;
  }
}

export function clearPosNcPayoutDraft(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}
