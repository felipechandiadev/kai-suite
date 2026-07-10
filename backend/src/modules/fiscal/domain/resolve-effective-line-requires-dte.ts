import { applyVariantFiscalProfile } from '@modules/product-variants/application/helpers/variant-fiscal-profile';
import type { VariantRequiresDteMap } from './filter-dte-transaction-lines';

export type LineRequiresDteSnapshot = Record<string, boolean>;

export const FISCAL_METADATA_VERSION = 1;

export type DbVariantFiscalRow = {
  id: string;
  requiresDte?: boolean | null;
  taxCategory?: unknown;
  taxIds?: string[] | null;
};

export function parsePosLineRequiresDteSnapshot(
  metadata: unknown,
): LineRequiresDteSnapshot | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const raw = (metadata as Record<string, unknown>).lineRequiresDte;
  if (!raw || typeof raw !== 'object') return null;
  const snapshot: LineRequiresDteSnapshot = {};
  for (const [variantId, value] of Object.entries(raw as Record<string, unknown>)) {
    const id = variantId.trim();
    if (!id) continue;
    snapshot[id] = value !== false;
  }
  return Object.keys(snapshot).length > 0 ? snapshot : null;
}

export function parseSelectedSaleDocumentKind(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const raw = (metadata as Record<string, unknown>).selectedSaleDocumentKind;
  return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
}

export function buildDbRequiresDteMap(
  variants: ReadonlyArray<DbVariantFiscalRow>,
): VariantRequiresDteMap {
  return new Map(
    variants.map((variant) => {
      const profile = applyVariantFiscalProfile(
        {
          taxCategory: variant.taxCategory,
          requiresDte: variant.requiresDte,
          taxIds: variant.taxIds,
        },
        [],
      );
      return [variant.id, profile.requiresDte] as const;
    }),
  );
}

/**
 * Línea tributaria para boleta solo si BD y snapshot POS (si existe) lo permiten.
 */
export function resolveEffectiveLineRequiresDteMap(
  variantIds: string[],
  dbRequiresDteByVariantId: VariantRequiresDteMap,
  posSnapshot: LineRequiresDteSnapshot | null,
): VariantRequiresDteMap {
  const effective = new Map<string, boolean>();
  for (const variantId of variantIds) {
    const id = variantId.trim();
    if (!id) continue;
    const dbRequires = dbRequiresDteByVariantId.has(id)
      ? dbRequiresDteByVariantId.get(id) !== false
      : false;
    const posRequires =
      posSnapshot && Object.prototype.hasOwnProperty.call(posSnapshot, id)
        ? posSnapshot[id] !== false
        : true;
    effective.set(id, dbRequires && posRequires);
  }
  return effective;
}

export function effectiveLineRequiresDteMapToRecord(
  map: VariantRequiresDteMap,
): LineRequiresDteSnapshot {
  return Object.fromEntries(map.entries());
}
