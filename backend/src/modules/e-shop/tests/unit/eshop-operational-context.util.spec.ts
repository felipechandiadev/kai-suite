import { BadRequestException } from '@nestjs/common';
import {
  alignBranchFromStorage,
  validateEShopOperationalSettings,
} from '../../application/helpers/eshop-operational-context.util';
import { buildDefaultCompanyEShopFlatSettings } from '@modules/companies/domain/company-eshop-flat.types';

describe('eshop-operational-context.util', () => {
  const base = {
    ...buildDefaultCompanyEShopFlatSettings(),
    eShopEnabled: true,
    eShopDefaultBranchId: 'branch-1',
    eShopDefaultStorageId: 'storage-1',
    eShopDefaultPriceListId: 'price-1',
  };

  it('validate requires branch, storage and price list when eShop enabled', async () => {
    await expect(
      validateEShopOperationalSettings('co-1', {
        ...base,
        eShopDefaultBranchId: null,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      validateEShopOperationalSettings('co-1', base),
    ).resolves.toEqual(base);
  });

  it('skips validation when eShop disabled', async () => {
    await expect(
      validateEShopOperationalSettings('co-1', {
        ...buildDefaultCompanyEShopFlatSettings(),
        eShopEnabled: false,
      }),
    ).resolves.toMatchObject({ eShopEnabled: false });
  });

  it('alignBranchFromStorage copies branch from storage', () => {
    const aligned = alignBranchFromStorage(base, { branchId: 'branch-from-storage' });
    expect(aligned.eShopDefaultBranchId).toBe('branch-from-storage');
  });
});
