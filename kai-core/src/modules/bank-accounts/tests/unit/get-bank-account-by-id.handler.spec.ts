import { Test, TestingModule } from '@nestjs/testing';
import { GetBankAccountByIdQueryHandler } from '@modules/bank-accounts/application/handlers/queries/get-bank-account-by-id.handler';
import { GetBankAccountByIdQuery } from '@modules/bank-accounts/application/queries/get-bank-account-by-id.query';
import { BankAccountsRepositoryPort } from '@modules/bank-accounts/application/ports/bank-accounts.repository.port';
import { AccountTypeName, BankName } from '@modules/persons/domain/person.entity';

describe('GetBankAccountByIdQueryHandler', () => {
  let handler: GetBankAccountByIdQueryHandler;
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
        GetBankAccountByIdQueryHandler,
        {
          provide: 'BankAccountsRepositoryPort',
          useValue: repository,
        },
      ],
    }).compile();

    handler = module.get(GetBankAccountByIdQueryHandler);
  });

  it('should return account when repository finds it', async () => {
    repository.findById.mockResolvedValueOnce({
      accountKey: 'acc-1',
      ownerType: 'person',
      ownerId: 'person-1',
      ownerName: 'Alice',
      bankName: BankName.BANCO_ESTADO,
      accountType: AccountTypeName.CUENTA_AHORRO,
      accountNumber: '12345',
    } as any);

    const result = await handler.execute(new GetBankAccountByIdQuery('acc-1'));

    expect(repository.findById).toHaveBeenCalledWith('acc-1');
    expect(result).toMatchObject({ accountKey: 'acc-1', ownerName: 'Alice' });
  });

  it('should return null when repository does not find account', async () => {
    repository.findById.mockResolvedValueOnce(null);

    const result = await handler.execute(new GetBankAccountByIdQuery('missing'));

    expect(result).toBeNull();
  });
});