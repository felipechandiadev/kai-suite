export type PosArCollectSaleRow = {
  id: string;
  documentNumber: string | null;
  balanceDue: number;
};

export type PosArCollectDraft = {
  customerId: string;
  customerDisplayName: string | null;
  sales: PosArCollectSaleRow[];
};

const STORAGE_KEY = "pos_ar_collect_v1";

export function writePosArCollectDraft(draft: PosArCollectDraft): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
}

export function readPosArCollectDraft(): PosArCollectDraft | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PosArCollectDraft;
    if (!parsed?.customerId?.trim() || !Array.isArray(parsed.sales)) return null;
    const sales = parsed.sales
      .filter((s) => s?.id?.trim() && (Number(s.balanceDue) || 0) > 0)
      .map((s) => ({
        id: s.id.trim(),
        documentNumber: s.documentNumber?.trim() ? s.documentNumber.trim() : null,
        balanceDue: Math.round(Number(s.balanceDue) || 0),
      }));
    if (sales.length === 0) return null;
    return {
      customerId: parsed.customerId.trim(),
      customerDisplayName: parsed.customerDisplayName?.trim() || null,
      sales,
    };
  } catch {
    return null;
  }
}

export function clearPosArCollectDraft(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}
