export type KaiProductId = 'kaistore' | 'kaifood' | 'kaiservices';

function resolveKaiProductId(raw: string | undefined): KaiProductId {
  const normalized = (raw ?? 'kaistore').trim().toLowerCase();
  if (normalized === 'kaifood' || normalized === 'kaiservices') {
    return normalized;
  }
  return 'kaistore';
}

/**
 * Módulo KaiFood (cuentas salón, transfer carrito, productos PREPARADO).
 * Activo cuando `NEXT_PUBLIC_KAI_PRODUCT=kaifood`.
 */
export function isKaiFoodEnabled(): boolean {
  return resolveKaiProductId(process.env.NEXT_PUBLIC_KAI_PRODUCT) === 'kaifood';
}
