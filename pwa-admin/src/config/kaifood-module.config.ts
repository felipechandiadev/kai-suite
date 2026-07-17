import { resolveKaiProductId } from '@/config/product-brand.config';

/**
 * Módulo KaiFood (salón, KDS, mesero, productos PREPARADO).
 * Activo cuando `NEXT_PUBLIC_KAI_PRODUCT=kaifood`.
 */
export function isKaiFoodEnabled(): boolean {
  return resolveKaiProductId(process.env.NEXT_PUBLIC_KAI_PRODUCT) === 'kaifood';
}
