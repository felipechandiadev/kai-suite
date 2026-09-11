export type KaiProductId = "kaistore" | "kaifood" | "kaiservices" | "kaisuite";

const PRODUCT_LABELS: Record<Exclude<KaiProductId, "kaisuite">, string> = {
  kaistore: "KaiStore",
  kaifood: "KaiFood",
  kaiservices: "Kai Services",
};

export function resolveKaiProductId(raw: string | undefined): KaiProductId {
  const normalized = (raw ?? "kaistore").trim().toLowerCase();
  if (
    normalized === "kaifood" ||
    normalized === "kaiservices" ||
    normalized === "kaisuite"
  ) {
    return normalized;
  }
  return "kaistore";
}

export function getKaiProductLabel(productId?: string): string {
  const id = resolveKaiProductId(productId);
  if (id === "kaisuite") return "Kai";
  return PRODUCT_LABELS[id];
}
