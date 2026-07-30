import { TypeOrmAccountingRuleRepository } from '@modules/accounting-rules/infrastructure/repositories/typeorm-accounting-rule.repository';

describe('TypeOrmAccountingRuleRepository', () => {
  let repository: TypeOrmAccountingRuleRepository;
  let ormRepository: {
    save: jest.Mock;
    findOne: jest.Mock;
    find: jest.Mock;
    update: jest.Mock;
  };

  beforeEach(() => {
    ormRepository = {
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
    };

    repository = new TypeOrmAccountingRuleRepository(ormRepository as any);
  });

  it('should save accounting rule', async () => {
    const rule = { id: 'rule-1' };
    ormRepository.save.mockResolvedValueOnce(rule);

    const result = await repository.save(rule as any);

    expect(ormRepository.save).toHaveBeenCalledWith(rule);
    expect(result).toBe(rule);
  });

  it('should find accounting rule by id', async () => {
    ormRepository.findOne.mockResolvedValueOnce({ id: 'rule-1' });

    const result = await repository.findById('rule-1');

    expect(ormRepository.findOne).toHaveBeenCalledWith({ where: { id: 'rule-1' } });
    expect(result).toMatchObject({ id: 'rule-1' });
  });

  it('should find active rules ordered by priority', async () => {
    ormRepository.find.mockResolvedValueOnce([]);

    await repository.findAll('company-1');

    expect(ormRepository.find).toHaveBeenCalledWith({
      where: { companyId: 'company-1', isActive: true },
      order: { priority: 'ASC' },
    });
  });

  it('should find active rules by transaction type', async () => {
    ormRepository.find.mockResolvedValueOnce([]);

    await repository.findByTransactionType('company-1', 'SALE');

    expect(ormRepository.find).toHaveBeenCalledWith({
      where: { companyId: 'company-1', transactionType: 'SALE', isActive: true },
      order: { priority: 'ASC' },
    });
  });

  it('should update and reload an accounting rule', async () => {
    ormRepository.update.mockResolvedValueOnce(undefined);
    ormRepository.findOne.mockResolvedValueOnce({ id: 'rule-1', priority: 10 });

    const result = await repository.update('rule-1', { priority: 10 } as any);

    expect(ormRepository.update).toHaveBeenCalledWith('rule-1', { priority: 10 });
    expect(result).toMatchObject({ id: 'rule-1', priority: 10 });
  });

  it('should throw when updated rule cannot be reloaded', async () => {
    ormRepository.update.mockResolvedValueOnce(undefined);
    ormRepository.findOne.mockResolvedValueOnce(null);

    await expect(repository.update('missing', {} as any)).rejects.toThrow(
      'Accounting rule with id missing not found',
    );
  });

  it('should deactivate an accounting rule', async () => {
    ormRepository.update.mockResolvedValueOnce(undefined);

    await repository.deactivate('rule-1');

    expect(ormRepository.update).toHaveBeenCalledWith('rule-1', { isActive: false });
  });
});