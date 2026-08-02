import { isKaiFoodProduct } from '@/config/product-brand.config';

/**
 * Módulo KaiFood (salón, KDS, mesero, productos PREPARADO).
 * Activo con `NEXT_PUBLIC_KAI_PRODUCT=kaifood` o `kaisuite`.
 */
export function isKaiFoodEnabled(): boolean {
  return isKaiFoodProduct(process.env.NEXT_PUBLIC_KAI_PRODUCT);
}

/** Empresa activa es vertical KaiFood (`company.kaiProduct`). */
export function isKaiFoodCompany(kaiProduct?: string | null): boolean {
  return (kaiProduct ?? '').trim().toLowerCase() === 'kaifood';
}

/**
 * KaiFood visible en admin: empresa activa KaiFood;
 * si no hay contexto de empresa, fallback al deploy.
 */
export function isKaiFoodEnabledForCompany(kaiProduct?: string | null): boolean {
  const fromCompany = (kaiProduct ?? '').trim().toLowerCase();
  if (fromCompany === 'kaifood') return true;
  if (
    fromCompany === 'kaistore' ||
    fromCompany === 'kaiservices'
  ) {
    return false;
  }
  return isKaiFoodEnabled();
}
