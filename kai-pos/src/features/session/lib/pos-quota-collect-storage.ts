export type PosQuotaCollectRow = {
  id: string;
  transactionId: string | null;
  documentNumber: string | null;
  amount: number;
  dueDate: string | null;
};

export type PosQuotaCollectDraft = {
  customerId: string;
  customerDisplayName: string | null;
  quotas: PosQuotaCollectRow[];
};

const STORAGE_KEY = "pos_quota_collect_v1";

export function writePosQuotaCollectDraft(draft: PosQuotaCollectDraft): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
}

export function readPosQuotaCollectDraft(): PosQuotaCollectDraft | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PosQuotaCollectDraft;
    if (!parsed?.customerId?.trim() || !Array.isArray(parsed.quotas)) return null;
    const quotas = parsed.quotas
      .filter((q) => q?.id?.trim() && (Number(q.amount) || 0) > 0)
      .map((q) => ({
        id: q.id.trim(),
        transactionId: q.transactionId?.trim() ? q.transactionId.trim() : null,
        documentNumber: q.documentNumber?.trim() ? q.documentNumber.trim() : null,
        amount: Math.round(Number(q.amount) || 0),
        dueDate: q.dueDate?.trim() ? q.dueDate.trim() : null,
      }));
    if (quotas.length === 0) return null;
    return {
      customerId: parsed.customerId.trim(),
      customerDisplayName: parsed.customerDisplayName?.trim() || null,
      quotas,
    };
  } catch {
    return null;
  }
}

export function clearPosQuotaCollectDraft(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}
