import { TypeOrmTransactionLinesRepository } from '@modules/transaction-lines/infrastructure/repositories/typeorm-transaction-lines.repository';

describe('TypeOrmTransactionLinesRepository', () => {
  let repository: TypeOrmTransactionLinesRepository;
  let ormRepository: {
    find: jest.Mock;
    findOne: jest.Mock;
  };

  const entity = {
    id: 'line-1',
    transactionId: 'tx-1',
    productId: 'product-1',
    productVariantId: 'variant-1',
    unitId: 'unit-1',
    taxId: 'tax-1',
    lineNumber: 1,
    productName: 'Gold Ring',
    productSku: 'SKU-1',
    variantName: 'Size 7',
    quantity: 2,
    quantityInBase: 2,
    unitOfMeasure: 'unit',
    unitConversionFactor: 1,
    unitPrice: 100,
    unitCost: 80,
    discountPercentage: 0,
    discountAmount: 0,
    taxRate: 19,
    taxAmount: 38,
    subtotal: 200,
    total: 238,
    notes: 'note',
    createdAt: new Date(),
  };

  beforeEach(() => {
    ormRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
    };

    repository = new TypeOrmTransactionLinesRepository(ormRepository as any);
  });

  it('should find all transaction lines and map them', async () => {
    ormRepository.find.mockResolvedValueOnce([entity]);

    const result = await repository.findAll();

    expect(ormRepository.find).toHaveBeenCalledWith({
      relations: ['product', 'productVariant', 'tax', 'unit'],
      order: { lineNumber: 'ASC' },
    });
    expect(result).toEqual([entity]);
  });

  it('should find a transaction line by id and map it', async () => {
    ormRepository.findOne.mockResolvedValueOnce(entity);

    const result = await repository.findById('line-1');

    expect(ormRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'line-1' },
      relations: ['product', 'productVariant', 'tax', 'unit'],
    });
    expect(result).toEqual(entity);
  });

  it('should return null when transaction line does not exist', async () => {
    ormRepository.findOne.mockResolvedValueOnce(null);

    const result = await repository.findById('missing');

    expect(result).toBeNull();
  });

  it('should find transaction lines by transaction id and map them', async () => {
    ormRepository.find.mockResolvedValueOnce([entity]);

    const result = await repository.findByTransactionId('tx-1');

    expect(ormRepository.find).toHaveBeenCalledWith({
      where: { transactionId: 'tx-1' },
      relations: ['product', 'productVariant', 'tax', 'unit'],
      order: { lineNumber: 'ASC' },
    });
    expect(result).toEqual([entity]);
  });
});