export type KaiProductId = 'kaistore' | 'kaifood' | 'kaiservices';

const PRODUCT_LABELS: Record<KaiProductId, string> = {
  kaistore: 'KaiStore',
  kaifood: 'KaiFood',
  kaiservices: 'Kai Services',
};

export function resolveKaiProductId(raw: string | undefined): KaiProductId {
  const normalized = (raw ?? 'kaistore').trim().toLowerCase();
  if (normalized === 'kaifood' || normalized === 'kaiservices') {
    return normalized;
  }
  return 'kaistore';
}

export function getKaiProductLabel(productId?: string): string {
  return PRODUCT_LABELS[resolveKaiProductId(productId)];
}

export function getKaiAdminAppName(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_NAME?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  return `${getKaiProductLabel(process.env.NEXT_PUBLIC_KAI_PRODUCT)} Admin`;
}
