import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountingAccount } from '@modules/accounting-accounts/domain/accounting-account.entity';
import { AccountingAccountRepositoryPort } from '@modules/accounting-accounts/application/ports/accounting-account.repository.port';

@Injectable()
export class AccountingAccountsRepository implements AccountingAccountRepositoryPort {
  constructor(
    @InjectRepository(AccountingAccount)
    private readonly repo: Repository<AccountingAccount>,
  ) {}

  async save(account: AccountingAccount): Promise<AccountingAccount> {
    return this.repo.save(account as any);
  }

  async findById(id: string): Promise<AccountingAccount | null> {
    const found = await this.repo.findOne({ where: { id } });
    return found ?? null;
  }

  async findByCompany(companyId: string): Promise<AccountingAccount[]> {
    const found = await this.repo.find({ where: { companyId } });
    return found;
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
