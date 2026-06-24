import { BadRequestException } from '@nestjs/common';
import { IsNull, Repository } from 'typeorm';
import { Branch } from '@modules/branches/domain/branch.entity';
import { Storage } from '@modules/storages/domain/storage.entity';
import { PriceList } from '@modules/price-lists/domain/price-list.entity';
import type { CompanyEShopFlatSettings } from '@modules/companies/domain/company-eshop-flat.types';

export type EShopOperationalContext = {
  branchId: string;
  storageId: string | null;
  priceListId: string | null;
};

export type EShopOperationalRepos = {
  branchRepo: Repository<Branch>;
  storageRepo: Repository<Storage>;
  priceListRepo: Repository<PriceList>;
};

/** Valida sucursal, almacén y lista de precios eShop al guardar settings. */
export async function validateEShopOperationalSettings(
  companyId: string,
  settings: CompanyEShopFlatSettings,
): Promise<CompanyEShopFlatSettings> {
  if (!settings.eShopEnabled) {
    return settings;
  }

  const branchId = settings.eShopDefaultBranchId?.trim() || null;
  const storageId = settings.eShopDefaultStorageId?.trim() || null;
  const priceListId = settings.eShopDefaultPriceListId?.trim() || null;

  if (!branchId) {
    throw new BadRequestException(
      'Configure la sucursal eShop (eShopDefaultBranchId)',
    );
  }
  if (!storageId) {
    throw new BadRequestException(
      'Configure el almacén eShop (eShopDefaultStorageId)',
    );
  }
  if (!priceListId) {
    throw new BadRequestException(
      'Configure la lista de precios eShop (eShopDefaultPriceListId)',
    );
  }

  return settings;
}

export async function validateEShopOperationalSettingsWithRepos(
  companyId: string,
  settings: CompanyEShopFlatSettings,
  repos: EShopOperationalRepos,
): Promise<CompanyEShopFlatSettings> {
  await validateEShopOperationalSettings(companyId, settings);

  if (!settings.eShopEnabled) {
    return settings;
  }

  const branchId = settings.eShopDefaultBranchId!.trim();
  const storageId = settings.eShopDefaultStorageId!.trim();
  const priceListId = settings.eShopDefaultPriceListId!.trim();

  const branch = await repos.branchRepo.findOne({
    where: { id: branchId, companyId, isActive: true, deletedAt: IsNull() },
  });
  if (!branch) {
    throw new BadRequestException('La sucursal eShop no existe o está inactiva');
  }

  const storage = await repos.storageRepo.findOne({
    where: { id: storageId, companyId, isActive: true, deletedAt: IsNull() },
  });
  if (!storage) {
    throw new BadRequestException('El almacén eShop no existe o está inactivo');
  }
  if (storage.branchId?.trim() && storage.branchId.trim() !== branchId) {
    throw new BadRequestException(
      'El almacén eShop no pertenece a la sucursal configurada',
    );
  }

  const priceList = await repos.priceListRepo.findOne({
    where: { id: priceListId, companyId, deletedAt: IsNull() },
  });
  if (!priceList) {
    throw new BadRequestException(
      'La lista de precios eShop no existe para esta empresa',
    );
  }

  return settings;
}

/** Resuelve contexto operativo para checkout/catálogo (con fallback de sucursal). */
export async function resolveEShopOperationalContext(
  companyId: string,
  flat: CompanyEShopFlatSettings,
  branchRepo: Repository<Branch>,
): Promise<EShopOperationalContext> {
  let branchId = flat.eShopDefaultBranchId?.trim() || null;
  if (!branchId) {
    const fallback = await branchRepo.findOne({
      where: { companyId, isActive: true, deletedAt: IsNull() },
      order: { createdAt: 'ASC' },
    });
    branchId = fallback?.id ?? null;
  }
  if (!branchId) {
    throw new BadRequestException(
      'Configure una sucursal por defecto para eShop (eShopDefaultBranchId)',
    );
  }

  return {
    branchId,
    storageId: flat.eShopDefaultStorageId?.trim() || null,
    priceListId: flat.eShopDefaultPriceListId?.trim() || null,
  };
}

/** Alinea branchId con el almacén seleccionado cuando el storage tiene sucursal. */
export function alignBranchFromStorage(
  settings: CompanyEShopFlatSettings,
  storage: Pick<Storage, 'branchId'> | null | undefined,
): CompanyEShopFlatSettings {
  const storageBranchId = storage?.branchId?.trim();
  if (!storageBranchId) {
    return settings;
  }
  return {
    ...settings,
    eShopDefaultBranchId: storageBranchId,
  };
}
