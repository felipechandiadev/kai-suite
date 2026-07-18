import { BadRequestException } from '@nestjs/common';
import { ProductionUnitScope } from '@modules/production-units/domain/production-unit.enums';

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
