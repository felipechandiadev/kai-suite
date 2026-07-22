import { isKaiFoodProduct } from '@/config/product-brand.config';

/**
 * Módulo KaiFood (salón, KDS, mesero, productos PREPARADO).
 * Activo con `NEXT_PUBLIC_KAI_PRODUCT=kaifood` o `kaisuite`.
 */
export function isKaiFoodEnabled(): boolean {
  return isKaiFoodProduct(process.env.NEXT_PUBLIC_KAI_PRODUCT);
}
