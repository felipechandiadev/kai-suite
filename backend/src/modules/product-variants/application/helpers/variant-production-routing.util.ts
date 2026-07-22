import { BadRequestException } from '@nestjs/common';
import {
  ProductionUnitPurpose,
  ProductionUnitScope,
} from '@modules/production-units/domain/production-unit.enums';
import { ProductType } from '@modules/products/domain/product.entity';

/**
 * Pure validation helpers for variant × branch → production unit routing.
 * Exercised by unit tests; service wraps DB access around these rules.
 */
export function assertRoutingDefaultsPerBranch(
  items: Array<{ branchId: string; isDefault: boolean }>,
): void {
  const defaultsByBranch = new Map<string, number>();
  for (const item of items) {
    if (item.isDefault) {
      defaultsByBranch.set(
        item.branchId,
        (defaultsByBranch.get(item.branchId) ?? 0) + 1,
      );
    }
  }
  const branchIds = [...new Set(items.map((i) => i.branchId))];
  for (const branchId of branchIds) {
    const count = defaultsByBranch.get(branchId) ?? 0;
    if (count !== 1) {
      throw new BadRequestException(
        'Cada sucursal con unidades asignadas debe tener exactamente una unidad por defecto.',
      );
    }
  }
}

export function assertUnitAllowedForBranch(data: {
  unitScope: ProductionUnitScope;
  unitBranchId: string | null | undefined;
  itemBranchId: string;
}): void {
  if (data.unitScope === ProductionUnitScope.BRANCH) {
    if (data.unitBranchId !== data.itemBranchId) {
      throw new BadRequestException(
        'La unidad de producción de sucursal no pertenece a la sucursal indicada.',
      );
    }
    return;
  }
  if (data.unitScope !== ProductionUnitScope.COMPANY) {
    throw new BadRequestException('Alcance de unidad de producción inválido.');
  }
}

/**
 * PREPARADO → cocina (comanda/KDS).
 * ELABORADO / MANUFACTURADO → lotes.
 * Otros tipos no deberían tener routing de producción.
 */
export function expectedProductionUnitPurposeForProductType(
  productType: ProductType | string | null | undefined,
): ProductionUnitPurpose | null {
  const t = String(productType ?? '')
    .trim()
    .toUpperCase();
  if (t === ProductType.PREPARADO) return ProductionUnitPurpose.KITCHEN;
  if (t === ProductType.ELABORADO || t === ProductType.MANUFACTURADO) {
    return ProductionUnitPurpose.BATCH;
  }
  return null;
}

export function assertUnitPurposeMatchesProductType(data: {
  productType: ProductType | string | null | undefined;
  unitPurpose: ProductionUnitPurpose | string;
  unitName?: string | null;
}): void {
  const expected = expectedProductionUnitPurposeForProductType(data.productType);
  if (!expected) {
    throw new BadRequestException(
      'Este tipo de producto no admite asignación de unidades de producción.',
    );
  }
  const purpose = String(data.unitPurpose ?? '')
    .trim()
    .toUpperCase();
  if (purpose !== expected) {
    const label =
      expected === ProductionUnitPurpose.KITCHEN
        ? 'Cocina (comanda / KDS)'
        : 'Producción por lotes';
    const name = data.unitName?.trim() ? ` «${data.unitName.trim()}»` : '';
    throw new BadRequestException(
      `La unidad${name} no es compatible: este producto requiere unidades de propósito ${label}.`,
    );
  }
}
