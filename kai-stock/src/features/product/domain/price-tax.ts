export function roundMoneyInt(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n);
}

export function effectiveIvaFactor(
  taxes: readonly { id: string; taxType: string; rate: number; isActive: boolean }[],
  selectedTaxIds: readonly string[],
): number {
  const idSet = new Set(selectedTaxIds);
  let sumRates = 0;
  for (const t of taxes) {
    if (!t.isActive || !idSet.has(t.id) || t.taxType !== "IVA") continue;
    const r = Number(t.rate);
    if (Number.isFinite(r) && r > 0) sumRates += r;
  }
  return 1 + sumRates / 100;
}

export function grossToNet(gross: number, factor: number): number {
  const f = Number.isFinite(factor) && factor > 0 ? factor : 1;
  return roundMoneyInt(gross / f);
}

export function buildInitialSku(productName: string, productId: string): string {
  const slug =
    productName
      .trim()
      .replace(/[^\w\s]/g, "")
      .replace(/\s+/g, "")
      .slice(0, 48) || "ITEM";
  const idPart = productId.replace(/-/g, "").slice(0, 8);
  const rand = Math.random().toString(36).slice(2, 8);
  const sku = `${slug}${idPart}${rand}`;
  return sku.length <= 100 ? sku : sku.slice(0, 100);
}
