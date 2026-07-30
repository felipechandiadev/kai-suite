import { BadRequestException } from '@nestjs/common';
import { SupplierDocumentFolioGuardService } from '@modules/transactions/application/services/supplier-document-folio-guard.service';
import { TransactionType } from '@modules/transactions/domain/transaction.entity';

describe('SupplierDocumentFolioGuardService', () => {
  it('rechaza folio duplicado para el mismo proveedor', async () => {
    const txRepo = {
      createQueryBuilder: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn(async () => ({ id: 'existing-tx' })),
      })),
    };
    const service = new SupplierDocumentFolioGuardService(txRepo as any);
    await expect(
      service.assertUniqueFolio({
        companyId: 'c1',
        supplierId: 's1',
        documentFolio: '123',
        transactionTypes: [TransactionType.SUPPLIER_INVOICE],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('permite folio si no existe', async () => {
    const txRepo = {
      createQueryBuilder: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn(async () => null),
      })),
    };
    const service = new SupplierDocumentFolioGuardService(txRepo as any);
    await expect(
      service.assertUniqueFolio({
        companyId: 'c1',
        supplierId: 's1',
        documentFolio: '456',
        transactionTypes: [TransactionType.SUPPLIER_INVOICE],
      }),
    ).resolves.toBeUndefined();
  });
});
