import { Test, TestingModule } from '@nestjs/testing';
import { GetBankAccountsQueryHandler } from '@modules/bank-accounts/application/handlers/queries/get-bank-accounts.handler';
import { GetBankAccountsQuery } from '@modules/bank-accounts/application/queries/get-bank-accounts.query';
import { BankAccountsRepositoryPort } from '@modules/bank-accounts/application/ports/bank-accounts.repository.port';
import { AccountTypeName, BankName } from '@modules/persons/domain/person.entity';

describe('GetBankAccountsQueryHandler', () => {
  let handler: GetBankAccountsQueryHandler;
  let repository: jest.Mocked<BankAccountsRepositoryPort>;

  beforeEach(async () => {
    repository = {
      getCashBalance: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetBankAccountsQueryHandler,
        {
          provide: 'BankAccountsRepositoryPort',
          useValue: repository,
        },
      ],
    }).compile();

    handler = module.get(GetBankAccountsQueryHandler);
  });

  it('should return all bank accounts from repository', async () => {
    repository.findAll.mockResolvedValueOnce([
      {
        accountKey: 'acc-1',
        ownerType: 'person',
        ownerId: 'person-1',
        ownerName: 'Alice',
        bankName: BankName.BANCO_ESTADO,
        accountType: AccountTypeName.CUENTA_AHORRO,
        accountNumber: '12345',
      },
    ] as any);

    const result = await handler.execute();

    expect(repository.findAll).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ accountKey: 'acc-1', ownerName: 'Alice' });
  });
});