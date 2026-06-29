import { parseEnvFlag } from '@/config/env-flag.util';

/**
 * Módulo joyería (precios de metales + calculadora por peso).
 * `NEXT_PUBLIC_JEWELRY_ENABLED=false` en despliegues sin joyería (supermercado, KaiFood, etc.).
 */
export function isJewelryModuleEnabled(): boolean {
  return parseEnvFlag(process.env.NEXT_PUBLIC_JEWELRY_ENABLED, false);
}
