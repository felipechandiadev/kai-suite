import { TypeOrmAccountingRepository } from '@modules/accounting/infrastructure/repositories/typeorm-accounting.repository';

describe('TypeOrmAccountingRepository', () => {
  let repository: TypeOrmAccountingRepository;
  let accountingAccountRepository: {
    findOneBy: jest.Mock;
  };
  let ledgerEntryRepository: {
    find: jest.Mock;
    save: jest.Mock;
  };

  beforeEach(() => {
    accountingAccountRepository = {
      findOneBy: jest.fn(),
    };

    ledgerEntryRepository = {
      find: jest.fn(),
      save: jest.fn(),
    };

    repository = new TypeOrmAccountingRepository(
      accountingAccountRepository as any,
      ledgerEntryRepository as any,
    );
  });

  it('should find accounting account by id', async () => {
    accountingAccountRepository.findOneBy.mockResolvedValueOnce({ id: 'acc-1' });

    const result = await repository.findAccountingAccountById('acc-1');

    expect(accountingAccountRepository.findOneBy).toHaveBeenCalledWith({ id: 'acc-1' });
    expect(result).toMatchObject({ id: 'acc-1' });
  });

  it('should find ledger entries by account id', async () => {
    ledgerEntryRepository.find.mockResolvedValueOnce([{ id: 'entry-1' }]);

    const result = await repository.findLedgerEntriesByAccount('acc-1');

    expect(ledgerEntryRepository.find).toHaveBeenCalledWith({
      where: { account: { id: 'acc-1' } },
    });
    expect(result).toEqual([{ id: 'entry-1' }]);
  });

  it('should save ledger entry', async () => {
    const entry = { id: 'entry-1' };
    ledgerEntryRepository.save.mockResolvedValueOnce(entry);

    const result = await repository.saveLedgerEntry(entry as any);

    expect(ledgerEntryRepository.save).toHaveBeenCalledWith(entry);
    expect(result).toBe(entry);
  });
});