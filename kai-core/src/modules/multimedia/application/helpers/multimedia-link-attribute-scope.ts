import type { SelectQueryBuilder } from 'typeorm';
import { MultimediaLink } from '../../domain/multimedia-link.entity';

export type MultimediaLinkAttributeScopeMode = 'general' | 'all';

/** Filtra links por ámbito de atributo: undefined/null = galería general (sin atributo). */
export function applyMultimediaLinkAttributeScope(
  qb: SelectQueryBuilder<MultimediaLink>,
  attributeId?: string | null,
  linkAlias = 'link',
  scope: MultimediaLinkAttributeScopeMode = 'general',
): void {
  if (scope === 'all') {
    return;
  }
  if (attributeId === undefined || attributeId === null) {
    qb.andWhere(`${linkAlias}.attributeId IS NULL`);
    return;
  }
  const trimmed = String(attributeId).trim();
  if (!trimmed) {
    qb.andWhere(`${linkAlias}.attributeId IS NULL`);
    return;
  }
  qb.andWhere(`${linkAlias}.attributeId = :attributeId`, { attributeId: trimmed });
}

export function normalizeMultimediaLinkAttributeId(
  attributeId?: string | null,
): string | null {
  if (attributeId === undefined || attributeId === null) {
    return null;
  }
  const trimmed = String(attributeId).trim();
  return trimmed.length > 0 ? trimmed : null;
}
