/**
 * DTO/API shape for company voucher kinds (tabla `company_voucher_kinds`).
 */
export type VoucherFaceValueMode = 'FIXED' | 'OPEN';

export type CompanyVoucherKind = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  faceValueMode: VoucherFaceValueMode;
  /** Obligatorio / >0 cuando faceValueMode === FIXED. */
  defaultFaceValue?: number | null;
  /**
   * En OPEN siempre es true (valor nominal obligatorio en la venta).
   * Se mantiene el campo por compat / API.
   */
  requireFaceValue: boolean;
  defaultIssuerName?: string | null;
};

export function activeCompanyVoucherKinds(
  kinds: CompanyVoucherKind[],
): CompanyVoucherKind[] {
  return kinds.filter((k) => k.isActive);
}

function trimOrNull(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

function truthy(v: unknown): boolean {
  return v === true || v === 1 || v === '1' || v === 'true';
}

/**
 * Sanitiza payload de alta/edición (sin asignar code/id — eso lo hace el servicio).
 */
export function sanitizeVoucherKindInput(
  raw: unknown,
): Omit<CompanyVoucherKind, 'id' | 'code'> & { id?: string; code?: string } | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const name = String(r.name ?? '').trim();
  if (!name) return null;
  const modeRaw = String(r.faceValueMode ?? 'OPEN').trim().toUpperCase();
  const faceValueMode: VoucherFaceValueMode =
    modeRaw === 'FIXED' ? 'FIXED' : 'OPEN';
  let defaultFaceValue: number | null = null;
  if (r.defaultFaceValue != null && Number.isFinite(Number(r.defaultFaceValue))) {
    defaultFaceValue = Math.round(Number(r.defaultFaceValue));
  }
  if (faceValueMode === 'FIXED' && !(defaultFaceValue != null && defaultFaceValue > 0)) {
    throw new Error(
      `El tipo de voucher "${name}" en modo FIXED requiere defaultFaceValue > 0`,
    );
  }
  const id =
    typeof r.id === 'string' && r.id.trim() ? r.id.trim() : undefined;
  return {
    ...(id ? { id } : {}),
    name,
    isActive: r.isActive === undefined ? true : truthy(r.isActive),
    faceValueMode,
    defaultFaceValue: faceValueMode === 'FIXED' ? defaultFaceValue : null,
    requireFaceValue: faceValueMode === 'OPEN',
    defaultIssuerName: trimOrNull(r.defaultIssuerName),
  };
}
