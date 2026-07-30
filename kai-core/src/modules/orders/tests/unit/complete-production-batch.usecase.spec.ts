import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CompleteProductionBatchUseCase } from '../../application/commands/complete-production-batch.usecase';
import { TransactionType } from '@modules/transactions/domain/transaction.entity';
import { RecipeType } from '@modules/recipes/domain/recipe-type.enum';

describe('CompleteProductionBatchUseCase', () => {
  const batchId = 'batch-1';
  const inputStorageId = 'storage-in';
  const outputStorageId = 'storage-out';
  const productionUnitId = 'unit-1';
  const outputVariantId = 'out-1';
  const inputVariantId = 'in-1';

  let txRepo: { findOne: jest.Mock; save: jest.Mock };
  let txLineRepo: { find: jest.Mock };
  let variantRepo: { find: jest.Mock };
  let stockLevelRepo: { find: jest.Mock };
  let recipesService: { list: jest.Mock };
  let transactionsService: { createTransaction: jest.Mock };
  let costingService: {
    summarizeLaborCost: jest.Mock;
    resolveLaborPerPiece: jest.Mock;
  };
  let useCase: CompleteProductionBatchUseCase;

  beforeEach(() => {
    txRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: batchId,
        companyId: 'company-1',
        transactionType: TransactionType.PRODUCTION_BATCH,
        branchId: 'branch-1',
        userId: 'user-1',
        storageId: inputStorageId,
        status: 'DRAFT',
        metadata: {
          links: { outputStorageId, productionUnitId },
          productionOrder: {
            productionUnitId,
            capacity: null,
            plannedStartAt: null,
            plannedDeliveryAt: null,
            lots: [],
          },
        },
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
          storageId: inputStorageId,
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
    costingService = {
      summarizeLaborCost: jest.fn().mockResolvedValue({
        laborUnitIds: ['lu-1'],
        employeeCount: 2,
        monthlyPayrollTotal: 1000,
        computedCapacity: 100,
        monthlyCapacity: 100,
        laborCostPerUnit: 10,
      }),
      resolveLaborPerPiece: jest.fn().mockResolvedValue({
        laborPerPiece: 10,
        source: 'history',
        warning: null,
      }),
    };

    useCase = new CompleteProductionBatchUseCase(
      txRepo as any,
      txLineRepo as any,
      variantRepo as any,
      stockLevelRepo as any,
      recipesService as any,
      transactionsService as any,
      costingService as any,
    );
  });

  it('values output from materials PMP + labor and sets completedAt', async () => {
    const result = await useCase.execute({ productionBatchId: batchId });

    expect(result.unitCost).toBe(110);
    expect(result.totalCost).toBe(220);
    expect(txRepo.save).toHaveBeenCalled();
    const saved = txRepo.save.mock.calls[0][0];
    expect(saved.completedAt).toBeInstanceOf(Date);
    expect(costingService.resolveLaborPerPiece).toHaveBeenCalled();

    const consumptionDto = transactionsService.createTransaction.mock.calls[0][0];
    expect(consumptionDto.total).toBe(200);

    const outputDto = transactionsService.createTransaction.mock.calls[1][0];
    expect(outputDto.metadata.links.materialsCost).toBe(200);
    expect(outputDto.metadata.links.laborCost).toBe(20);
    expect(outputDto.lines[0].unitPrice).toBe(110);
  });

  it('uses MO=0 when resolve returns none (cold start)', async () => {
    costingService.resolveLaborPerPiece.mockResolvedValue({
      laborPerPiece: 0,
      source: 'none',
      warning: 'MO pendiente de historial',
    });

    const result = await useCase.execute({ productionBatchId: batchId });

    expect(result.unitCost).toBe(100);
    expect(result.totalCost).toBe(200);
    const outputDto = transactionsService.createTransaction.mock.calls[1][0];
    expect(outputDto.metadata.links.laborCost).toBe(0);
  });

  it('uses per-variant override from resolveLaborPerPiece', async () => {
    costingService.resolveLaborPerPiece.mockResolvedValue({
      laborPerPiece: 25,
      source: 'override',
      warning: null,
    });

    const result = await useCase.execute({ productionBatchId: batchId });
    // materials 200 + MO 50
    expect(result.totalCost).toBe(250);
    expect(result.unitCost).toBe(125);
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
        storageId: inputStorageId,
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

  it('aggregates multi-lote with labor', async () => {
    txLineRepo.find.mockResolvedValue([
      {
        productVariantId: outputVariantId,
        quantity: 2,
        productName: 'Torta A',
      },
      {
        productVariantId: outputVariantId,
        quantity: 3,
        productName: 'Torta B',
      },
    ]);
    stockLevelRepo.find.mockResolvedValue([
      {
        productVariantId: inputVariantId,
        storageId: inputStorageId,
        availableStock: 20,
        physicalStock: 20,
      },
    ]);
    transactionsService.createTransaction
      .mockReset()
      .mockResolvedValueOnce({ id: 'adj-out' })
      .mockResolvedValueOnce({ id: 'adj-in' });

    const result = await useCase.execute({ productionBatchId: batchId });

    expect(result.totalCost).toBe(550);
    expect(result.unitCost).toBe(110);

    const outputDto = transactionsService.createTransaction.mock.calls[1][0];
    expect(outputDto.lines).toHaveLength(2);
    expect(outputDto.metadata.links.materialsCost).toBe(500);
    expect(outputDto.metadata.links.laborCost).toBe(50);
  });
});
