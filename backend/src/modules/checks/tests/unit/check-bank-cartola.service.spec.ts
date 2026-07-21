import { CheckBankCartolaService } from '@modules/checks/application/check-bank-cartola.service';
import {
  Check,
  CheckDirection,
  CheckStatus,
} from '@modules/checks/domain/check.entity';

describe('CheckBankCartolaService', () => {
  let service: CheckBankCartolaService;
  let movements: {
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
  };
  let transactions: {
    findOne: jest.Mock;
    update: jest.Mock;
  };

  const baseCheck = (overrides: Partial<Check> = {}): Check =>
    ({
      id: 'check-1',
      companyId: 'co-1',
      direction: CheckDirection.OUTGOING,
      status: CheckStatus.CLEARED,
      checkNumber: '1234',
      bankName: 'BCI',
      bankAccountKey: 'banco-estado-cc',
      amount: 50000,
      transactionId: 'tx-1',
      ...overrides,
    }) as Check;

  beforeEach(() => {
    movements = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation((x) => x),
      save: jest.fn().mockResolvedValue({}),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    transactions = {
      findOne: jest.fn().mockResolvedValue({
        id: 'tx-1',
        bankAccountKey: null,
        metadata: {},
      }),
      update: jest.fn().mockResolvedValue(undefined),
    };
    service = new CheckBankCartolaService(
      movements as any,
      transactions as any,
    );
  });

  it('creates OUT bank movement and sets bankAccountKey on payment', async () => {
    await service.postCleared(baseCheck());

    expect(movements.save).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'co-1',
        transactionId: 'tx-1',
        direction: 'OUT',
        bankAccount: 'banco-estado-cc',
        amount: 50000,
      }),
    );
    expect(transactions.update).toHaveBeenCalledWith(
      'tx-1',
      expect.objectContaining({
        bankAccountKey: 'banco-estado-cc',
      }),
    );
  });

  it('is idempotent when movement for check already exists', async () => {
    movements.find.mockResolvedValueOnce([
      {
        id: 'bm-1',
        description: 'Compensación cheque 1234 (BCI) [check:check-1]',
      },
    ]);
    await service.postCleared(baseCheck());
    expect(movements.save).not.toHaveBeenCalled();
  });

  it('creates IN movement for incoming checks', async () => {
    await service.postCleared(
      baseCheck({ direction: CheckDirection.INCOMING }),
    );
    expect(movements.save).toHaveBeenCalledWith(
      expect.objectContaining({ direction: 'IN' }),
    );
  });

  it('skips when bankAccountKey cannot be resolved', async () => {
    await service.postCleared(baseCheck({ bankAccountKey: null }));
    expect(movements.save).not.toHaveBeenCalled();
  });
});
