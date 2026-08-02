/**
 * Configuración de propinas KaiFood para una empresa.
 *
 * Se persiste en `companies.settings.tips` (JSON). No requiere migración.
 *
 * - `enabled`: master switch (default false / opt-in).
 * - `suggestPercent`: % sugerido en pre-cuenta/cobro (Chile Art. 64: 10).
 * - `allowCustomAmount`: cliente puede modificar el monto.
 * - `allowCashTips`: permitir tip en efectivo además de tarjeta.
 * - `distributionMode`: atribución post-cobro (motor en fases posteriores).
 */
export type TipDistributionMode = 'NONE' | 'DIRECT' | 'POOL' | 'POINTS';

/**
 * Pesos del acuerdo de trabajadores (POOL = %, POINTS = puntos).
 * Clave = employeeId. Vacío → reparto igual entre tipsEligible.
 */
export type TipDistributionWeights = Record<string, number>;

export interface CompanyTipSettings {
  enabled: boolean;
  suggestPercent: number;
  allowCustomAmount: boolean;
  allowCashTips: boolean;
  distributionMode: TipDistributionMode;
  /**
   * Acuerdo de trabajadores para POOL/POINTS (no es política del empleador).
   * employeeId → peso.
   */
  distributionWeights: TipDistributionWeights;
}

export function buildDefaultCompanyTipSettings(): CompanyTipSettings {
  return {
    enabled: false,
    suggestPercent: 10,
    allowCustomAmount: true,
    allowCashTips: true,
    distributionMode: 'NONE',
    distributionWeights: {},
  };
}

const truthy = (v: unknown): boolean =>
  v === true || v === 1 || v === '1' || v === 'true';

function clampPercent(raw: unknown, fallback: number): number {
  const n =
    typeof raw === 'number'
      ? raw
      : typeof raw === 'string' && raw.trim() !== ''
        ? Number(raw)
        : fallback;
  if (!Number.isFinite(n)) return fallback;
  const i = Math.round(n);
  if (i < 0) return 0;
  if (i > 100) return 100;
  return i;
}

const DISTRIBUTION_MODES: TipDistributionMode[] = [
  'NONE',
  'DIRECT',
  'POOL',
  'POINTS',
];

function sanitizeDistributionMode(raw: unknown): TipDistributionMode {
  const s = typeof raw === 'string' ? raw.trim().toUpperCase() : '';
  if (DISTRIBUTION_MODES.includes(s as TipDistributionMode)) {
    return s as TipDistributionMode;
  }
  return 'NONE';
}

function sanitizeDistributionWeights(raw: unknown): TipDistributionWeights {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: TipDistributionWeights = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const id = String(k || '').trim();
    if (!id) continue;
    const n =
      typeof v === 'number'
        ? v
        : typeof v === 'string' && v.trim() !== ''
          ? Number(v)
          : NaN;
    if (!Number.isFinite(n) || n <= 0) continue;
    out[id] = n;
  }
  return out;
}

export function sanitizeCompanyTipSettings(raw: unknown): CompanyTipSettings {
  const r = (raw ?? {}) as Partial<CompanyTipSettings> & {
    [k: string]: unknown;
  };
  return {
    enabled: truthy(r.enabled),
    suggestPercent: clampPercent(r.suggestPercent, 10),
    allowCustomAmount:
      r.allowCustomAmount === undefined ? true : truthy(r.allowCustomAmount),
    allowCashTips:
      r.allowCashTips === undefined ? true : truthy(r.allowCashTips),
    distributionMode: sanitizeDistributionMode(r.distributionMode),
    distributionWeights: sanitizeDistributionWeights(r.distributionWeights),
  };
}
