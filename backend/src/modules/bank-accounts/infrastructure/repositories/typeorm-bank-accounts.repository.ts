import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { randomUUID } from 'crypto';
import { BankAccountsRepositoryPort } from '../../application/ports/bank-accounts.repository.port';
import { BankAccount, BankAccountOwnerType } from '../../domain/bank-account.entity';
import { CreateBankAccountDto } from '../../application/dto/create-bank-account.dto';
import { UpdateBankAccountDto } from '../../application/dto/update-bank-account.dto';
import { Company } from '@modules/companies/domain/company.entity';
import { Person, PersonBankAccount } from '@modules/persons/domain/person.entity';

@Injectable()
export class TypeOrmBankAccountsRepository implements BankAccountsRepositoryPort {
  constructor(
    @InjectRepository(Person)
    private readonly personRepository: Repository<Person>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
  ) {}

  private normalizeAccount(
    account: PersonBankAccount,
    ownerType: BankAccountOwnerType,
    ownerId: string,
    ownerName: string,
  ): BankAccount {
    return {
      accountKey: account.accountKey || randomUUID(),
      ownerType,
      ownerId,
      ownerName,
      bankName: account.bankName,
      accountType: account.accountType,
      accountNumber: account.accountNumber,
      accountHolderName: account.accountHolderName,
      accountHolderRut: account.accountHolderRut,
      isPrimary: account.isPrimary,
      notes: account.notes,
      currentBalance: account.currentBalance,
    };
  }

  private async loadAllAccounts(): Promise<BankAccount[]> {
    const persons = await this.personRepository.find({ where: { deletedAt: IsNull() } });
    const companies = await this.companyRepository.find({ where: { deletedAt: IsNull() } });

    const personAccounts = persons.flatMap((person) =>
      (person.bankAccounts || []).map((account) =>
        this.normalizeAccount(account, 'person', person.id, `${person.firstName} ${person.lastName || ''}`.trim()),
      ),
    );

    const companyAccounts = companies.flatMap((company) =>
      (company.bankAccounts || []).map((account) =>
        this.normalizeAccount(account, 'company', company.id, company.razonSocial),
      ),
    );

    return [...personAccounts, ...companyAccounts];
  }

  async getCashBalance(): Promise<{ balance: number }> {
    const accounts = await this.loadAllAccounts();
    const balance = accounts.reduce((sum, account) => sum + (account.currentBalance || 0), 0);
    return { balance };
  }

  async findAll(): Promise<BankAccount[]> {
    return this.loadAllAccounts();
  }

  async findById(accountKey: string): Promise<BankAccount | null> {
    const accounts = await this.loadAllAccounts();
    return accounts.find((account) => account.accountKey === accountKey) || null;
  }

  async create(data: CreateBankAccountDto): Promise<BankAccount> {
    const owner = await this.findOwner(data.ownerType, data.ownerId);
    if (!owner) {
      throw new Error(`Owner not found for ${data.ownerType} ${data.ownerId}`);
    }

    const account: PersonBankAccount = {
      accountKey: randomUUID(),
      bankName: data.bankName,
      accountType: data.accountType,
      accountNumber: data.accountNumber,
      accountHolderName: data.accountHolderName,
      accountHolderRut: data.accountHolderRut,
      isPrimary: data.isPrimary,
      notes: data.notes,
      currentBalance: data.currentBalance,
    };

    owner.bankAccounts = [...(owner.bankAccounts || []), account];
    await this.saveOwner(owner, data.ownerType);

    return this.normalizeAccount(account, data.ownerType, data.ownerId, this.getOwnerName(owner, data.ownerType));
  }

  async update(accountKey: string, data: UpdateBankAccountDto): Promise<BankAccount> {
    const [owner, ownerType] = await this.findOwnerWithAccount(accountKey);
    if (!owner) {
      throw new Error(`Bank account ${accountKey} not found`);
    }

    const account = (owner.bankAccounts || []).find((a) => a.accountKey === accountKey);
    if (!account) {
      throw new Error(`Bank account ${accountKey} not found`);
    }

    Object.assign(account, data);
    await this.saveOwner(owner, ownerType);

    return this.normalizeAccount(account, ownerType, owner.id, this.getOwnerName(owner, ownerType));
  }

  async remove(accountKey: string): Promise<void> {
    const [owner, ownerType] = await this.findOwnerWithAccount(accountKey);
    if (!owner) {
      throw new Error(`Bank account ${accountKey} not found`);
    }

    owner.bankAccounts = (owner.bankAccounts || []).filter((account) => account.accountKey !== accountKey);
    await this.saveOwner(owner, ownerType);
  }

  private async findOwner(
    ownerType: BankAccountOwnerType,
    ownerId: string,
  ): Promise<Person | Company | null> {
    if (ownerType === 'person') {
      return this.personRepository.findOne({ where: { id: ownerId, deletedAt: IsNull() } });
    }
    return this.companyRepository.findOne({ where: { id: ownerId, deletedAt: IsNull() } });
  }

  private async findOwnerWithAccount(
    accountKey: string,
  ): Promise<[Person | Company, BankAccountOwnerType]> {
    const persons = await this.personRepository.find({ where: { deletedAt: IsNull() } });
    for (const person of persons) {
      if ((person.bankAccounts || []).some((account) => account.accountKey === accountKey)) {
        return [person, 'person'];
      }
    }

    const companies = await this.companyRepository.find({ where: { deletedAt: IsNull() } });
    for (const company of companies) {
      if ((company.bankAccounts || []).some((account) => account.accountKey === accountKey)) {
        return [company, 'company'];
      }
    }

    throw new Error(`Bank account ${accountKey} not found`);
  }

  private async saveOwner(owner: Person | Company, ownerType: BankAccountOwnerType) {
    if (ownerType === 'person') {
      await this.personRepository.save(owner as Person);
    } else {
      await this.companyRepository.save(owner as Company);
    }
  }

  private getOwnerName(owner: Person | Company, ownerType: BankAccountOwnerType): string {
    if (ownerType === 'person') {
      const person = owner as Person;
      return `${person.firstName} ${person.lastName || ''}`.trim();
    }

    return (owner as Company).razonSocial;
  }
}
