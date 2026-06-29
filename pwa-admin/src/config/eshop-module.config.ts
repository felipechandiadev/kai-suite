import { parseEnvFlag } from '@/config/env-flag.util';

/**
 * Habilita el módulo eShop en este despliegue del admin.
 * `NEXT_PUBLIC_ESHOP_ENABLED=false` oculta navegación y ajustes de eShop;
 * otras pantallas pueden importar `isEShopModuleEnabled()` para el mismo criterio.
 */
export function isEShopModuleEnabled(): boolean {
  return parseEnvFlag(process.env.NEXT_PUBLIC_ESHOP_ENABLED, true);
}
