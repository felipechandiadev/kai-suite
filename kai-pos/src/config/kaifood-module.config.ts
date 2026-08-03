export type KaiProductId = 'kaistore' | 'kaifood' | 'kaiservices' | 'kaisuite';

function resolveKaiProductId(raw: string | undefined): KaiProductId {
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

/**
 * Módulo KaiFood (salón, KDS, mesero, productos PREPARADO).
 * Activo con `NEXT_PUBLIC_KAI_PRODUCT=kaifood` o `kaisuite`.
 */
export function isKaiFoodEnabled(): boolean {
  const id = resolveKaiProductId(process.env.NEXT_PUBLIC_KAI_PRODUCT);
  return id === 'kaifood' || id === 'kaisuite';
}

/** Empresa activa es vertical KaiFood (`company.kaiProduct`). */
export function isKaiFoodCompany(kaiProduct?: string | null): boolean {
  return (kaiProduct ?? '').trim().toLowerCase() === 'kaifood';
}

/**
 * KaiFood visible en POS: empresa activa KaiFood;
 * si no hay contexto de empresa, fallback al deploy.
 */
export function isKaiFoodEnabledForCompany(kaiProduct?: string | null): boolean {
  const fromCompany = (kaiProduct ?? '').trim().toLowerCase();
  if (fromCompany === 'kaifood') return true;
  if (fromCompany === 'kaistore' || fromCompany === 'kaiservices') {
    return false;
  }
  return isKaiFoodEnabled();
}
