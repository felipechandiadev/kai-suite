import { TypeOrmAccountingRuleRepository } from '@modules/ledger-entries/infrastructure/repositories/typeorm-accounting-rule.repository';

describe('LedgerEntries TypeOrmAccountingRuleRepository', () => {
  let repository: TypeOrmAccountingRuleRepository;
  let ormRepository: {
    findOne: jest.Mock;
    find: jest.Mock;
  };

  beforeEach(() => {
    ormRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
    };

    repository = new TypeOrmAccountingRuleRepository(ormRepository as any);
  });

  it('should find accounting rule by id', async () => {
    ormRepository.findOne.mockResolvedValueOnce({ id: 'rule-1' });

    const result = await repository.findById('rule-1');

    expect(ormRepository.findOne).toHaveBeenCalledWith({ where: { id: 'rule-1' } });
    expect(result).toMatchObject({ id: 'rule-1' });
  });

  it('should find rules by scope', async () => {
    ormRepository.find.mockResolvedValueOnce([{ id: 'rule-1' }]);

    const result = await repository.findByScope('SALE');

    expect(ormRepository.find).toHaveBeenCalledWith({ where: { appliesTo: 'SALE' } });
    expect(result).toEqual([{ id: 'rule-1' }]);
  });

  it('should find rules by transaction type', async () => {
    ormRepository.find.mockResolvedValueOnce([{ id: 'rule-1' }]);

    const result = await repository.findByTransactionType('PURCHASE');

    expect(ormRepository.find).toHaveBeenCalledWith({ where: { transactionType: 'PURCHASE' } });
    expect(result).toEqual([{ id: 'rule-1' }]);
  });

  it('should find all rules and delegate generic find', async () => {
    ormRepository.find.mockResolvedValueOnce([{ id: 'rule-1' }]).mockResolvedValueOnce([{ id: 'rule-2' }]);

    const all = await repository.findAll();
    const filtered = await repository.find({ where: { isActive: true } });

    expect(ormRepository.find).toHaveBeenNthCalledWith(1);
    expect(ormRepository.find).toHaveBeenNthCalledWith(2, { where: { isActive: true } });
    expect(all).toEqual([{ id: 'rule-1' }]);
    expect(filtered).toEqual([{ id: 'rule-2' }]);
  });
});