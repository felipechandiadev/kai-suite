import { BadRequestException } from '@nestjs/common';
import { ProductType } from '@modules/products/domain/product.entity';
import { isUUID } from 'class-validator';

export type ProductionAttributeOptionInput = {
  id: string;
  label: string;
  displayOrder: number;
};

export type ProductionAttributeInput = {
  id: string;
  name: string;
  description?: string | null;
  tagKey?: string | null;
  tagLabel?: string | null;
  displayOrder: number;
  options: ProductionAttributeOptionInput[];
};

const TAG_KEY_RE = /^[a-z0-9]+(?:[_-][a-z0-9]+)*$/;

export function normalizeProductionTagKey(
  raw: unknown,
): string | null {
  if (raw == null || raw === '') return null;
  const s = String(raw)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  if (!s) return null;
  if (!TAG_KEY_RE.test(s)) {
    throw new BadRequestException(
      `tagKey inválido: "${String(raw)}". Usá solo a-z, 0-9, guión y guión bajo.`,
    );
  }
  return s;
}

export function assertManufacturadoForProductionAttributes(
  productType: ProductType | string | null | undefined,
): void {
  const t = String(productType ?? '')
    .trim()
    .toUpperCase();
  if (t !== ProductType.MANUFACTURADO) {
    throw new BadRequestException(
      'Los atributos de producción solo aplican a productos MANUFACTURADO.',
    );
  }
}

/**
 * Sanitiza y valida el payload de replace. Lanza BadRequestException.
 */
export function sanitizeProductionAttributesPayload(
  raw: unknown,
): ProductionAttributeInput[] {
  if (!Array.isArray(raw)) {
    throw new BadRequestException('items debe ser un arreglo');
  }
  const out: ProductionAttributeInput[] = [];
  const attrIds = new Set<string>();
  const optionIds = new Set<string>();

  for (let i = 0; i < raw.length; i++) {
    const row = (raw[i] ?? {}) as Record<string, unknown>;
    const id = typeof row.id === 'string' ? row.id.trim() : '';
    if (!isUUID(id)) {
      throw new BadRequestException(
        `Atributo #${i + 1}: id UUID requerido`,
      );
    }
    if (attrIds.has(id)) {
      throw new BadRequestException(`Atributo duplicado (id ${id})`);
    }
    attrIds.add(id);

    const name = typeof row.name === 'string' ? row.name.trim() : '';
    if (!name) {
      throw new BadRequestException(
        `Atributo #${i + 1}: el nombre es obligatorio`,
      );
    }

    const description =
      typeof row.description === 'string' && row.description.trim()
        ? row.description.trim()
        : null;
    const tagKey = normalizeProductionTagKey(row.tagKey);
    const tagLabel =
      typeof row.tagLabel === 'string' && row.tagLabel.trim()
        ? row.tagLabel.trim().slice(0, 80)
        : tagKey
          ? tagKey.charAt(0).toUpperCase() + tagKey.slice(1)
          : null;

    const displayOrder = Number.isFinite(Number(row.displayOrder))
      ? Math.trunc(Number(row.displayOrder))
      : i;

    if (!Array.isArray(row.options) || row.options.length === 0) {
      throw new BadRequestException(
        `Atributo «${name}»: debe tener al menos una opción`,
      );
    }

    const options: ProductionAttributeOptionInput[] = [];
    for (let j = 0; j < row.options.length; j++) {
      const opt = (row.options[j] ?? {}) as Record<string, unknown>;
      const oid = typeof opt.id === 'string' ? opt.id.trim() : '';
      if (!isUUID(oid)) {
        throw new BadRequestException(
          `Atributo «${name}» opción #${j + 1}: id UUID requerido`,
        );
      }
      if (optionIds.has(oid)) {
        throw new BadRequestException(`Opción duplicada (id ${oid})`);
      }
      optionIds.add(oid);
      const label = typeof opt.label === 'string' ? opt.label.trim() : '';
      if (!label) {
        throw new BadRequestException(
          `Atributo «${name}» opción #${j + 1}: el label es obligatorio`,
        );
      }
      options.push({
        id: oid,
        label: label.slice(0, 120),
        displayOrder: Number.isFinite(Number(opt.displayOrder))
          ? Math.trunc(Number(opt.displayOrder))
          : j,
      });
    }

    out.push({
      id,
      name: name.slice(0, 120),
      description,
      tagKey,
      tagLabel,
      displayOrder,
      options,
    });
  }

  return out;
}
