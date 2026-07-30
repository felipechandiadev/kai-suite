export type KaiProductId = 'kaistore' | 'kaifood' | 'kaiservices' | 'kaisuite';

const PRODUCT_LABELS: Record<KaiProductId, string> = {
  kaistore: 'KaiStore',
  kaifood: 'KaiFood',
  kaiservices: 'Kai Services',
  kaisuite: 'Kai Suite',
};

export function resolveKaiProductId(raw: string | undefined): KaiProductId {
  const normalized = (raw ?? 'kaistore').trim().toLowerCase();
  if (
    normalized === 'kaifood' ||
    normalized === 'kaiservices' ||
    normalized === 'kaisuite'
  ) {
    return normalized;
  }
  return 'kaistore';
}

/** Gastronomía (PREPARADO, salón, KDS): KaiFood o Suite. */
export function isKaiFoodProduct(productId?: string): boolean {
  const id = resolveKaiProductId(productId);
  return id === 'kaifood' || id === 'kaisuite';
}

/** Lavandería (recepción, catálogo de prendas): solo vertical Kai Services. */
export function isKaiServicesProduct(productId?: string): boolean {
  return resolveKaiProductId(productId) === 'kaiservices';
}

export function getKaiProductLabel(productId?: string): string {
  return PRODUCT_LABELS[resolveKaiProductId(productId)];
}

/**
 * Marca de producto para topbar: empresa activa primero;
 * si falta el campo y el deploy es suite → "Kai" (paraguas).
 */
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
  if (deploy === "kaisuite") {
    return "Kai";
  }
  return getKaiProductLabel(deploy || undefined);
}

export function getKaiAdminAppName(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_NAME?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  return getKaiProductLabel(process.env.NEXT_PUBLIC_KAI_PRODUCT);
}
