/** Lavandería en menú/rutas POS: solo con `NEXT_PUBLIC_KAI_PRODUCT=kaiservices`. */
export function isKaiServicesEnabled(): boolean {
  const id = (process.env.NEXT_PUBLIC_KAI_PRODUCT ?? 'kaistore').trim().toLowerCase();
  return id === 'kaiservices';
}
