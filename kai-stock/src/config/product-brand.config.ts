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

/** Marca de producto en topbar: empresa activa → env; suite sin dato → Kai. */
export function resolveTopbarProductLabel(
  companyKaiProduct?: string | null,
): string {
  const fromCompany = (companyKaiProduct ?? "").trim().toLowerCase();
  if (
    fromCompany === "kaistore" ||
    fromCompany === "kaifood" ||
    fromCompany === "kaiservices"
  ) {
    return getKaiProductLabel(fromCompany);
  }
  const deploy = (process.env.NEXT_PUBLIC_KAI_PRODUCT ?? "").trim().toLowerCase();
  if (deploy === "kaisuite") return "Kai";
  return getKaiProductLabel(deploy || undefined);
}
