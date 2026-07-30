/**
 * Configuración del módulo de cotizaciones para una empresa.
 *
 * Se persiste dentro de `companies.settings.quotations` (columna JSON), por
 * lo que NO requiere migración propia y puede evolucionar sin cambios de
 * schema.
 *
 * - `enabled`: master switch del módulo. Si está en false, los endpoints de
 *   cotizaciones rechazan creación / conversión.
 * - `defaultValidityDays`: días de vigencia por defecto al emitir una nueva
 *   cotización (`validUntil = issuedAt + defaultValidityDays`).
 * - `maxValidityDays`: límite superior; el operador puede acortar pero no
 *   exceder este valor (siempre y cuando `allowCustomValidity=true`).
 * - `allowCustomValidity`: si true, el operador puede sobrescribir
 *   `validUntil` por cotización; si false, siempre se usa el default.
 * - `defaultTerms`: texto legal por defecto que se imprime al pie del
 *   documento (puede vaciarse en cada cotización).
 *
 * Las cotizaciones vencidas no se convierten a venta/pedido (regla fija en
 * `ConvertQuotationUseCase`).
 */
export interface CompanyQuotationSettings {
  enabled: boolean;
  defaultValidityDays: number;
  maxValidityDays: number;
  allowCustomValidity: boolean;
  defaultTerms: string | null;
}

/**
 * Defaults: módulo habilitado con 15 días de vigencia, máximo 60, vigencia
 * editable.
 */
export function buildDefaultCompanyQuotationSettings(): CompanyQuotationSettings {
  return {
    enabled: true,
    defaultValidityDays: 15,
    maxValidityDays: 60,
    allowCustomValidity: true,
    defaultTerms: null,
  };
}

function trimOrNull(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

function clampDays(
  raw: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  const n =
    typeof raw === 'number'
      ? raw
      : typeof raw === 'string' && raw.trim() !== ''
        ? Number(raw)
        : fallback;
  if (!Number.isFinite(n)) return fallback;
  const i = Math.round(n);
  if (i < min) return min;
  if (i > max) return max;
  return i;
}

const truthy = (v: unknown): boolean =>
  v === true || v === 1 || v === '1' || v === 'true';

/**
 * Normaliza un payload arbitrario a `CompanyQuotationSettings`. Aplica
 * coerciones laxas (acepta `0/1`, `"true"/"false"`, números como string)
 * y garantiza invariantes:
 *   - `defaultValidityDays >= 1`
 *   - `maxValidityDays >= defaultValidityDays`
 *   - `defaultValidityDays <= 365`, `maxValidityDays <= 1825`
 */
export function sanitizeCompanyQuotationSettings(
  raw: unknown,
): CompanyQuotationSettings {
  const r = (raw ?? {}) as Partial<CompanyQuotationSettings> & {
    [k: string]: unknown;
  };

  const enabled = truthy(r.enabled);
  const allowCustomValidity = truthy(r.allowCustomValidity);

  const defaultValidityDays = clampDays(r.defaultValidityDays, 15, 1, 365);
  let maxValidityDays = clampDays(r.maxValidityDays, 60, 1, 1825);
  if (maxValidityDays < defaultValidityDays) {
    maxValidityDays = defaultValidityDays;
  }

  return {
    enabled,
    defaultValidityDays,
    maxValidityDays,
    allowCustomValidity,
    defaultTerms: trimOrNull(r.defaultTerms),
  };
}
