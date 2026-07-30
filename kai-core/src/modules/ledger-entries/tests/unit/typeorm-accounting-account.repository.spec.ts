import { TypeOrmAccountingAccountRepository } from '@modules/ledger-entries/infrastructure/repositories/typeorm-accounting-account.repository';

describe('TypeOrmAccountingAccountRepository', () => {
  let repository: TypeOrmAccountingAccountRepository;
  let ormRepository: {
    findOne: jest.Mock;
    find: jest.Mock;
  };

  beforeEach(() => {
    ormRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
    };

    repository = new TypeOrmAccountingAccountRepository(ormRepository as any);
  });

  it('should find accounting account by id', async () => {
    ormRepository.findOne.mockResolvedValueOnce({ id: 'acc-1' });

    const result = await repository.findById('acc-1');

    expect(ormRepository.findOne).toHaveBeenCalledWith({ where: { id: 'acc-1' } });
    expect(result).toMatchObject({ id: 'acc-1' });
  });

  it('should find accounting account by code', async () => {
    ormRepository.findOne.mockResolvedValueOnce({ id: 'acc-1', code: '1000' });

    const result = await repository.findByCode('1000');

    expect(ormRepository.findOne).toHaveBeenCalledWith({ where: { code: '1000' } });
    expect(result).toMatchObject({ id: 'acc-1', code: '1000' });
  });

  it('should find accounts by company id', async () => {
    ormRepository.find.mockResolvedValueOnce([{ id: 'acc-1' }]);

    const result = await repository.findByCompanyId('company-1');

    expect(ormRepository.find).toHaveBeenCalledWith({ where: { companyId: 'company-1' } });
    expect(result).toEqual([{ id: 'acc-1' }]);
  });

  it('should delegate generic find', async () => {
    ormRepository.find.mockResolvedValueOnce([{ id: 'acc-1' }]);

    const result = await repository.find({ where: { level: 1 } });

    expect(ormRepository.find).toHaveBeenCalledWith({ where: { level: 1 } });
    expect(result).toEqual([{ id: 'acc-1' }]);
  });
});