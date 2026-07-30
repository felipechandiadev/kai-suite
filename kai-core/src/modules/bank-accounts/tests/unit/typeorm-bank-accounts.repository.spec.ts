import * as crypto from 'crypto';
import { TypeOrmBankAccountsRepository } from '@modules/bank-accounts/infrastructure/repositories/typeorm-bank-accounts.repository';

describe('TypeOrmBankAccountsRepository', () => {
  let repository: TypeOrmBankAccountsRepository;
  let personRepository: {
    find: jest.Mock;
    findOne: jest.Mock;
    save: jest.Mock;
  };
  let companyRepository: {
    find: jest.Mock;
    findOne: jest.Mock;
    save: jest.Mock;
  };

  beforeEach(() => {
    personRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    };
    companyRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    };

    repository = new TypeOrmBankAccountsRepository(personRepository as any, companyRepository as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should aggregate balance across person and company accounts', async () => {
    personRepository.find.mockResolvedValueOnce([
      {
        id: 'person-1',
        firstName: 'Ana',
        lastName: 'Perez',
        bankAccounts: [{ accountKey: 'p-1', currentBalance: 100 }],
      },
    ]);
    companyRepository.find.mockResolvedValueOnce([
      {
        id: 'company-1',
        name: 'Flow Store',
        bankAccounts: [{ accountKey: 'c-1', currentBalance: 250 }],
      },
    ]);

    const result = await repository.getCashBalance();

    expect(result).toEqual({ balance: 350 });
  });

  it('should return all normalized accounts', async () => {
    personRepository.find.mockResolvedValueOnce([
      {
        id: 'person-1',
        firstName: 'Ana',
        lastName: 'Perez',
        bankAccounts: [
          {
            accountKey: 'p-1',
            bankName: 'Bank',
            accountType: 'checking',
            accountNumber: '123',
            accountHolderName: 'Ana Perez',
            isPrimary: true,
            notes: 'main',
            currentBalance: 100,
          },
        ],
      },
    ]);
    companyRepository.find.mockResolvedValueOnce([
      {
        id: 'company-1',
        name: 'Flow Store',
        bankAccounts: [
          {
            accountKey: 'c-1',
            bankName: 'Bank',
            accountType: 'savings',
            accountNumber: '456',
            accountHolderName: 'Flow Store',
            isPrimary: false,
            notes: undefined,
            currentBalance: 250,
          },
        ],
      },
    ]);

    const result = await repository.findAll();

    expect(result).toEqual([
      expect.objectContaining({ accountKey: 'p-1', ownerType: 'person', ownerId: 'person-1' }),
      expect.objectContaining({ accountKey: 'c-1', ownerType: 'company', ownerId: 'company-1' }),
    ]);
  });

  it('should find account by accountKey', async () => {
    personRepository.find.mockResolvedValueOnce([
      {
        id: 'person-1',
        firstName: 'Ana',
        lastName: 'Perez',
        bankAccounts: [{ accountKey: 'p-1', currentBalance: 100 }],
      },
    ]);
    companyRepository.find.mockResolvedValueOnce([]);

    const result = await repository.findById('p-1');

    expect(result).toEqual(expect.objectContaining({ accountKey: 'p-1', ownerType: 'person' }));
  });

  it('should create a person bank account and persist it on owner', async () => {
    jest.spyOn(crypto, 'randomUUID').mockReturnValue('11111111-1111-4111-8111-111111111111');
    const owner = {
      id: 'person-1',
      firstName: 'Ana',
      lastName: 'Perez',
      bankAccounts: [],
    };
    personRepository.findOne.mockResolvedValueOnce(owner);
    personRepository.save.mockResolvedValueOnce(owner);

    const result = await repository.create({
      ownerType: 'person',
      ownerId: 'person-1',
      bankName: 'Bank',
      accountType: 'checking',
      accountNumber: '123',
      accountHolderName: 'Ana Perez',
      isPrimary: true,
      notes: 'main',
      currentBalance: 100,
    } as any);

    expect(personRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'person-1', deletedAt: expect.anything() },
    });
    expect(personRepository.save).toHaveBeenCalledWith(owner);
    expect(owner.bankAccounts).toHaveLength(1);
    expect(result).toEqual(
      expect.objectContaining({
        accountKey: '11111111-1111-4111-8111-111111111111',
        ownerType: 'person',
        ownerName: 'Ana Perez',
      }),
    );
  });

  it('should throw when creating account for missing owner', async () => {
    companyRepository.findOne.mockResolvedValueOnce(null);

    await expect(
      repository.create({ ownerType: 'company', ownerId: 'company-1' } as any),
    ).rejects.toThrow('Owner not found for company company-1');
  });

  it('should update existing company account', async () => {
    const company = {
      id: 'company-1',
      name: 'Flow Store',
      bankAccounts: [{ accountKey: 'c-1', accountNumber: '123', currentBalance: 50 }],
    };
    personRepository.find.mockResolvedValueOnce([]);
    companyRepository.find.mockResolvedValueOnce([company]);
    companyRepository.save.mockResolvedValueOnce(company);

    const result = await repository.update('c-1', { accountNumber: '999', currentBalance: 80 } as any);

    expect(companyRepository.save).toHaveBeenCalledWith(company);
    expect(result).toEqual(
      expect.objectContaining({
        accountKey: 'c-1',
        ownerType: 'company',
        accountNumber: '999',
        currentBalance: 80,
      }),
    );
  });

  it('should remove account from owner', async () => {
    const person = {
      id: 'person-1',
      firstName: 'Ana',
      lastName: 'Perez',
      bankAccounts: [
        { accountKey: 'p-1', currentBalance: 50 },
        { accountKey: 'p-2', currentBalance: 20 },
      ],
    };
    personRepository.find.mockResolvedValueOnce([person]);
    companyRepository.find.mockResolvedValueOnce([]);
    personRepository.save.mockResolvedValueOnce(person);

    await repository.remove('p-1');

    expect(person.bankAccounts).toEqual([{ accountKey: 'p-2', currentBalance: 20 }]);
    expect(personRepository.save).toHaveBeenCalledWith(person);
  });
});