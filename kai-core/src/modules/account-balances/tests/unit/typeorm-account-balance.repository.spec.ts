import { TypeOrmAccountBalanceRepository } from '@modules/account-balances/infrastructure/repositories/typeorm-account-balance.repository';

describe('TypeOrmAccountBalanceRepository', () => {
  let repository: TypeOrmAccountBalanceRepository;
  let balanceRepository: {
    find: jest.Mock;
  };
  let periodRepository: {};
  let dataSource: {
    createQueryRunner: jest.Mock;
  };
  let queryRunner: {
    connect: jest.Mock;
    startTransaction: jest.Mock;
    commitTransaction: jest.Mock;
    rollbackTransaction: jest.Mock;
    release: jest.Mock;
    manager: {
      createQueryBuilder: jest.Mock;
      findOne: jest.Mock;
      find: jest.Mock;
      create: jest.Mock;
      save: jest.Mock;
    };
  };

  beforeEach(() => {
    queryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        createQueryBuilder: jest.fn(),
        findOne: jest.fn(),
        find: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
      },
    };

    balanceRepository = {
      find: jest.fn(),
    };

    periodRepository = {};

    dataSource = {
      createQueryRunner: jest.fn().mockReturnValue(queryRunner),
    };

    repository = new TypeOrmAccountBalanceRepository(
      balanceRepository as any,
      periodRepository as any,
      dataSource as any,
    );
  });

  it('should return early when there are no ledger entries', async () => {
    await repository.updateBalancesForLedgerEntries([]);

    expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
  });

  it('should create new grouped balances and commit transaction', async () => {
    const transactionQuery = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn()
        .mockResolvedValueOnce({ periodId: 'period-1', companyId: 'company-1' })
        .mockResolvedValueOnce({ periodId: 'period-1', companyId: 'company-1' }),
    };
    queryRunner.manager.createQueryBuilder.mockReturnValue(transactionQuery);
    queryRunner.manager.findOne.mockResolvedValue(null);
    queryRunner.manager.create.mockImplementation((_entity, payload) => payload);
    queryRunner.manager.save.mockResolvedValue(undefined);

    await repository.updateBalancesForLedgerEntries([
      { transactionId: 'tx-1', accountId: 'acc-1', debit: 10, credit: 0 },
      { transactionId: 'tx-2', accountId: 'acc-1', debit: 5, credit: 2 },
    ]);

    expect(dataSource.createQueryRunner).toHaveBeenCalled();
    expect(queryRunner.connect).toHaveBeenCalled();
    expect(queryRunner.startTransaction).toHaveBeenCalled();
    expect(queryRunner.manager.create).toHaveBeenCalledWith(expect.anything(), {
      companyId: 'company-1',
      accountId: 'acc-1',
      periodId: 'period-1',
      openingDebit: 0,
      openingCredit: 0,
      periodDebit: 15,
      periodCredit: 2,
      closingDebit: 15,
      closingCredit: 2,
      frozen: false,
    });
    expect(queryRunner.commitTransaction).toHaveBeenCalled();
    expect(queryRunner.release).toHaveBeenCalled();
  });

  it('should rollback when trying to update a frozen balance', async () => {
    const transactionQuery = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ periodId: 'period-1', companyId: 'company-1' }),
    };
    queryRunner.manager.createQueryBuilder.mockReturnValue(transactionQuery);
    queryRunner.manager.findOne.mockResolvedValue({
      frozen: true,
      periodDebit: 0,
      periodCredit: 0,
      openingDebit: 0,
      openingCredit: 0,
    });

    await expect(
      repository.updateBalancesForLedgerEntries([
        { transactionId: 'tx-1', accountId: 'acc-1', debit: 10, credit: 0 },
      ]),
    ).rejects.toThrow('Cannot update balance for frozen period period-1');

    expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    expect(queryRunner.release).toHaveBeenCalled();
  });

  it('should freeze balances and create opening balances for next period', async () => {
    const balances = [
      {
        companyId: 'company-1',
        accountId: 'acc-1',
        periodId: 'period-1',
        openingDebit: 10,
        openingCredit: 5,
        periodDebit: 3,
        periodCredit: 2,
        closingDebit: 0,
        closingCredit: 0,
        frozen: false,
      },
    ];
    const nextPeriodQuery = {
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({ id: 'period-2' }),
    };
    queryRunner.manager.find.mockResolvedValueOnce(balances as any);
    queryRunner.manager.findOne
      .mockResolvedValueOnce({ id: 'period-1', endDate: '2026-01-31' })
      .mockResolvedValueOnce(null);
    queryRunner.manager.createQueryBuilder.mockReturnValue(nextPeriodQuery);
    queryRunner.manager.create.mockImplementation((_entity, payload) => payload);
    queryRunner.manager.save.mockResolvedValue(undefined);

    await repository.freezeBalancesForPeriod('period-1');

    expect(queryRunner.manager.save).toHaveBeenCalledWith(
      expect.objectContaining({
        frozen: true,
        frozenAt: expect.any(Date),
        closingDebit: 13,
        closingCredit: 7,
      }),
    );
    expect(queryRunner.manager.create).toHaveBeenCalledWith(expect.anything(), {
      companyId: 'company-1',
      accountId: 'acc-1',
      periodId: 'period-2',
      openingDebit: 13,
      openingCredit: 7,
      periodDebit: 0,
      periodCredit: 0,
      closingDebit: 13,
      closingCredit: 7,
      frozen: false,
    });
    expect(queryRunner.commitTransaction).toHaveBeenCalled();
    expect(queryRunner.release).toHaveBeenCalled();
  });

  it('should find balances for a period with relations and ordering', async () => {
    balanceRepository.find.mockResolvedValueOnce([{ id: 'balance-1' }]);

    const result = await repository.findBalancesForPeriod('company-1', 'period-1');

    expect(balanceRepository.find).toHaveBeenCalledWith({
      where: { companyId: 'company-1', periodId: 'period-1' },
      relations: ['account', 'period', 'company'],
      order: { account: { code: 'ASC' } },
    });
    expect(result).toEqual([{ id: 'balance-1' }]);
  });
});