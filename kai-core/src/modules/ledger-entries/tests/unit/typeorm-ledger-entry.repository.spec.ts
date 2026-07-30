import { TypeOrmLedgerEntryRepository } from '@modules/ledger-entries/infrastructure/repositories/typeorm-ledger-entry.repository';

describe('TypeOrmLedgerEntryRepository', () => {
  let repository: TypeOrmLedgerEntryRepository;
  let ormRepository: {
    save: jest.Mock;
    findOne: jest.Mock;
    find: jest.Mock;
    create: jest.Mock;
    createQueryBuilder: jest.Mock;
    remove: jest.Mock;
  };
  let queryBuilder: {
    where: jest.Mock;
    getMany: jest.Mock;
  };

  beforeEach(() => {
    queryBuilder = {
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    };

    ormRepository = {
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      remove: jest.fn(),
    };

    repository = new TypeOrmLedgerEntryRepository(ormRepository as any);
  });

  it('should save one ledger entry', async () => {
    const entry = { id: 'le-1' };
    ormRepository.save.mockResolvedValueOnce(entry);

    const result = await repository.save(entry as any);

    expect(ormRepository.save).toHaveBeenCalledWith(entry);
    expect(result).toBe(entry);
  });

  it('should save many ledger entries', async () => {
    const entries = [{ id: 'le-1' }, { id: 'le-2' }];
    ormRepository.save.mockResolvedValueOnce(entries);

    const result = await repository.saveMany(entries as any);

    expect(ormRepository.save).toHaveBeenCalledWith(entries);
    expect(result).toBe(entries);
  });

  it('should find ledger entry by id', async () => {
    ormRepository.findOne.mockResolvedValueOnce({ id: 'le-1' });

    const result = await repository.findById('le-1');

    expect(ormRepository.findOne).toHaveBeenCalledWith({ where: { id: 'le-1' } });
    expect(result).toMatchObject({ id: 'le-1' });
  });

  it('should find entries by transaction account and person ids', async () => {
    ormRepository.find.mockResolvedValue([{ id: 'le-1' }]);

    await repository.findByTransactionId('tx-1');
    await repository.findByAccountId('acc-1');
    await repository.findByPersonId('person-1');

    expect(ormRepository.find).toHaveBeenNthCalledWith(1, { where: { transactionId: 'tx-1' } });
    expect(ormRepository.find).toHaveBeenNthCalledWith(2, { where: { accountId: 'acc-1' } });
    expect(ormRepository.find).toHaveBeenNthCalledWith(3, { where: { personId: 'person-1' } });
  });

  it('should query entries by date range', async () => {
    const startDate = new Date('2026-01-01');
    const endDate = new Date('2026-01-31');
    queryBuilder.getMany.mockResolvedValueOnce([{ id: 'le-1' }]);

    const result = await repository.findByDateRange(startDate, endDate);

    expect(ormRepository.createQueryBuilder).toHaveBeenCalledWith('le');
    expect(queryBuilder.where).toHaveBeenCalledWith(
      'le.entryDate BETWEEN :startDate AND :endDate',
      { startDate, endDate },
    );
    expect(result).toEqual([{ id: 'le-1' }]);
  });

  it('should delegate generic find, create and remove', async () => {
    ormRepository.find.mockResolvedValueOnce([{ id: 'le-1' }]);
    ormRepository.create.mockReturnValueOnce({ id: 'le-2' });
    ormRepository.remove.mockResolvedValueOnce(undefined);
    const entity = { id: 'le-1' };

    const found = await repository.find({ where: { id: 'le-1' } });
    const created = repository.create({ id: 'le-2' });
    const qb = repository.createQueryBuilder('alias');
    await repository.remove(entity as any);

    expect(found).toEqual([{ id: 'le-1' }]);
    expect(created).toEqual({ id: 'le-2' });
    expect(ormRepository.create).toHaveBeenCalledWith({ id: 'le-2' });
    expect(ormRepository.createQueryBuilder).toHaveBeenCalledWith('alias');
    expect(qb).toBe(queryBuilder);
    expect(ormRepository.remove).toHaveBeenCalledWith(entity);
  });
});