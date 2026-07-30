import { TypeOrmPaymentsRepository } from '@modules/payments/infrastructure/repositories/typeorm-payments.repository';

describe('TypeOrmPaymentsRepository', () => {
  let repository: TypeOrmPaymentsRepository;
  let ormRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    find: jest.Mock;
  };
  let dataSource: {
    getRepository: jest.Mock;
  };

  beforeEach(() => {
    ormRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
    };

    dataSource = {
      getRepository: jest.fn().mockReturnValue(ormRepository),
    };

    repository = new TypeOrmPaymentsRepository(dataSource as any);
  });

  it('should create and save a payment', async () => {
    const payload = { id: 'pay-1', amount: 1000 };
    const entity = { ...payload, persisted: false };
    const saved = { ...payload, persisted: true };
    ormRepository.create.mockReturnValueOnce(entity);
    ormRepository.save.mockResolvedValueOnce(saved);

    const result = await repository.createPayment(payload);

    expect(dataSource.getRepository).toHaveBeenCalled();
    expect(ormRepository.create).toHaveBeenCalledWith(payload);
    expect(ormRepository.save).toHaveBeenCalledWith(entity);
    expect(result).toBe(saved);
  });

  it('should get payment by id', async () => {
    ormRepository.findOne.mockResolvedValueOnce({ id: 'pay-1' });

    const result = await repository.getPaymentById('pay-1');

    expect(ormRepository.findOne).toHaveBeenCalledWith({ where: { id: 'pay-1' } });
    expect(result).toMatchObject({ id: 'pay-1' });
  });

  it('should find payments by sale id', async () => {
    ormRepository.find.mockResolvedValueOnce([{ id: 'pay-1' }]);

    const result = await repository.findPaymentsBySaleId('sale-1');

    expect(ormRepository.find).toHaveBeenCalledWith({
      where: { saleTransactionId: 'sale-1' },
    });
    expect(result).toEqual([{ id: 'pay-1' }]);
  });
});