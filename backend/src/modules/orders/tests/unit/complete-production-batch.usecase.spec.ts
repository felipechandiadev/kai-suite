import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CompleteProductionBatchUseCase } from '../../application/commands/complete-production-batch.usecase';
import { TransactionType } from '@modules/transactions/domain/transaction.entity';
import { RecipeType } from '@modules/recipes/domain/recipe-type.enum';

describe('CompleteProductionBatchUseCase', () => {
  const batchId = 'batch-1';
  const storageId = 'storage-1';
  const outputVariantId = 'out-1';
  const inputVariantId = 'in-1';

  let txRepo: { findOne: jest.Mock; save: jest.Mock };
  let txLineRepo: { find: jest.Mock };
  let variantRepo: { find: jest.Mock };
  let stockLevelRepo: { find: jest.Mock };
  let recipesService: { list: jest.Mock };
  let transactionsService: { createTransaction: jest.Mock };
  let useCase: CompleteProductionBatchUseCase;

  beforeEach(() => {
    txRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: batchId,
        transactionType: TransactionType.PRODUCTION_BATCH,
        branchId: 'branch-1',
        userId: 'user-1',
        storageId,
        status: 'DRAFT',
        metadata: { links: {} },
      }),
      save: jest.fn().mockImplementation(async (row) => row),
    };
    txLineRepo = {
      find: jest.fn().mockResolvedValue([
        {
          productVariantId: outputVariantId,
          quantity: 2,
          productName: 'Torta',
        },
      ]),
    };
    variantRepo = {
      find: jest.fn().mockResolvedValue([{ id: inputVariantId, sku: 'HARINA', pmp: 100 }]),
    };
    stockLevelRepo = {
      find: jest.fn().mockResolvedValue([
        {
          productVariantId: inputVariantId,
          storageId,
          availableStock: 10,
          physicalStock: 10,
        },
      ]),
    };
    recipesService = {
      list: jest.fn().mockResolvedValue([
        {
          id: 'recipe-1',
          version: 1,
          isActive: true,
          type: RecipeType.PRODUCTION,
          lines: [
            {
              inputVariantId,
              qtyPerOutputUnit: 1,
              wasteFactor: 0,
              sortOrder: 1,
            },
          ],
        },
      ]),
    };
    transactionsService = {
      createTransaction: jest
        .fn()
        .mockResolvedValueOnce({ id: 'adj-out' })
        .mockResolvedValueOnce({ id: 'adj-in' }),
    };

    useCase = new CompleteProductionBatchUseCase(
      txRepo as any,
      txLineRepo as any,
      variantRepo as any,
      stockLevelRepo as any,
      recipesService as any,
      transactionsService as any,
    );
  });

  it('values output from input PMP and creates consumption + output txs', async () => {
    const result = await useCase.execute({ productionBatchId: batchId });

    expect(result.unitCost).toBe(100);
    expect(result.totalCost).toBe(200);
    expect(transactionsService.createTransaction).toHaveBeenCalledTimes(2);

    const consumptionDto = transactionsService.createTransaction.mock.calls[0][0];
    expect(consumptionDto.transactionType).toBe(TransactionType.ADJUSTMENT_OUT);
    expect(consumptionDto.lines[0].unitPrice).toBe(100);
    expect(consumptionDto.lines[0].quantity).toBe(2);

    const outputDto = transactionsService.createTransaction.mock.calls[1][0];
    expect(outputDto.transactionType).toBe(TransactionType.ADJUSTMENT_IN);
    expect(outputDto.metadata.origin).toBe('PRODUCTION_OUTPUT');
    expect(outputDto.lines[0].unitPrice).toBe(100);
    expect(outputDto.lines[0].total).toBe(200);
  });

  it('rejects when input PMP is missing', async () => {
    variantRepo.find.mockResolvedValue([{ id: inputVariantId, sku: 'HARINA', pmp: null }]);
    await expect(useCase.execute({ productionBatchId: batchId })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(transactionsService.createTransaction).not.toHaveBeenCalled();
  });

  it('rejects when stock is insufficient', async () => {
    stockLevelRepo.find.mockResolvedValue([
      {
        productVariantId: inputVariantId,
        storageId,
        availableStock: 1,
        physicalStock: 1,
      },
    ]);
    await expect(useCase.execute({ productionBatchId: batchId })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(transactionsService.createTransaction).not.toHaveBeenCalled();
  });

  it('rejects when batch is missing', async () => {
    txRepo.findOne.mockResolvedValue(null);
    await expect(useCase.execute({ productionBatchId: batchId })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
