import { resolveKaiProductId } from '@/config/product-brand.config';

export function isKaiServicesEnabled(): boolean {
  return resolveKaiProductId(process.env.NEXT_PUBLIC_KAI_PRODUCT) === 'kaiservices';
}
