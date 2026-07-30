export type SignalSeverity = 'OK' | 'WATCH' | 'CRITICAL' | 'INFO';

export type SignalCtaDto = {
  label: string;
  href: string;
};

/** Producto destacado en la card (nombre + atributos; SKU secundario). */
export type SignalSubjectDto = {
  name: string;
  attributes?: string | null;
  sku?: string | null;
};

export type SignalCardDto = {
  id: string;
  title: string;
  severity: SignalSeverity;
  headline: string;
  context: string;
  insight: string;
  cta?: SignalCtaDto;
  computedAt: string;
  subject?: SignalSubjectDto;
  meta?: Record<string, unknown>;
};

export type SignalsBoardResponse = {
  signals: SignalCardDto[];
  computedAt: string;
};

export type SignalEvalContext = {
  companyId: string;
  branchId?: string;
  now: Date;
};

export const SIGNAL_SEVERITY_RANK: Record<SignalSeverity, number> = {
  CRITICAL: 0,
  WATCH: 1,
  INFO: 2,
  OK: 3,
};

export function unavailableSignal(
  id: string,
  title: string,
  now: Date,
  cta?: SignalCtaDto,
): SignalCardDto {
  return {
    id,
    title,
    severity: 'INFO',
    headline: '—',
    context: 'Sin datos suficientes',
    insight: 'No disponible ahora',
    cta,
    computedAt: now.toISOString(),
  };
}

/** Etiqueta de atributos desde `attributeValues` JSON. */
export function formatAttributeValues(raw: unknown): string {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return '';
  const values = Object.values(raw as Record<string, unknown>)
    .map((v) => String(v ?? '').trim())
    .filter(Boolean);
  return values.join(', ');
}

export function formatProductDisplayName(
  productName: string,
  attributes?: string | null,
): string {
  const name = productName.trim() || 'Producto';
  const attrs = (attributes ?? '').trim();
  return attrs ? `${name} · ${attrs}` : name;
}
