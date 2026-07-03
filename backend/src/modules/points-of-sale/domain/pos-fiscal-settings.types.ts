import {
  DEFAULT_SALE_DOCUMENT_KIND,
  SALE_DOCUMENT_KINDS,
  type SaleDocumentKind,
} from '@modules/fiscal/domain/sale-document-kind';

export interface PosFiscalSettings {
  allowedDocumentKinds: SaleDocumentKind[];
  defaultDocumentKind: SaleDocumentKind;
}

export const DEFAULT_POS_FISCAL_SETTINGS: PosFiscalSettings = {
  allowedDocumentKinds: ['TICKET'],
  defaultDocumentKind: DEFAULT_SALE_DOCUMENT_KIND,
};

function isSaleDocumentKind(value: unknown): value is SaleDocumentKind {
  return (SALE_DOCUMENT_KINDS as readonly string[]).includes(String(value ?? '').trim().toUpperCase());
}

export function readPosFiscalSettings(settings: unknown): PosFiscalSettings {
  const raw = (settings as { fiscal?: Partial<PosFiscalSettings> } | null)?.fiscal;
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_POS_FISCAL_SETTINGS };
  }

  const allowed = Array.isArray(raw.allowedDocumentKinds)
    ? raw.allowedDocumentKinds.filter(isSaleDocumentKind)
    : [];
  const allowedDocumentKinds =
    allowed.length > 0 ? [...new Set(allowed)] : [...DEFAULT_POS_FISCAL_SETTINGS.allowedDocumentKinds];

  if (!allowedDocumentKinds.includes('TICKET')) {
    allowedDocumentKinds.unshift('TICKET');
  }

  let defaultDocumentKind = isSaleDocumentKind(raw.defaultDocumentKind)
    ? raw.defaultDocumentKind
    : DEFAULT_SALE_DOCUMENT_KIND;
  if (!allowedDocumentKinds.includes(defaultDocumentKind)) {
    defaultDocumentKind = allowedDocumentKinds[0] ?? DEFAULT_SALE_DOCUMENT_KIND;
  }

  return { allowedDocumentKinds, defaultDocumentKind };
}

export function sanitizePosFiscalSettingsPatch(
  current: unknown,
  patch: Partial<PosFiscalSettings> | undefined,
): PosFiscalSettings {
  const base = readPosFiscalSettings(current);
  if (!patch) return base;

  if (Array.isArray(patch.allowedDocumentKinds)) {
    const allowed = patch.allowedDocumentKinds.filter(isSaleDocumentKind);
    if (allowed.length > 0) {
      base.allowedDocumentKinds = [...new Set(allowed)];
    }
  }
  if (!base.allowedDocumentKinds.includes('TICKET')) {
    base.allowedDocumentKinds.unshift('TICKET');
  }
  if (patch.defaultDocumentKind !== undefined && isSaleDocumentKind(patch.defaultDocumentKind)) {
    base.defaultDocumentKind = patch.defaultDocumentKind;
  }
  if (!base.allowedDocumentKinds.includes(base.defaultDocumentKind)) {
    base.defaultDocumentKind = base.allowedDocumentKinds[0] ?? DEFAULT_SALE_DOCUMENT_KIND;
  }
  return base;
}
