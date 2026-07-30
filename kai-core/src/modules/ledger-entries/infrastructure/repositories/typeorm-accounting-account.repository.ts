import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountingAccountRepositoryPort } from '../../application/ports/accounting-account.repository.port';
import { AccountingAccount } from '@modules/accounting-accounts/domain/accounting-account.entity';

@Injectable()
export class TypeOrmAccountingAccountRepository implements AccountingAccountRepositoryPort {
  constructor(
    @InjectRepository(AccountingAccount)
    private readonly repository: Repository<AccountingAccount>,
  ) {}

  async findById(id: string): Promise<AccountingAccount | null> {
    return await this.repository.findOne({ where: { id } }) ?? null;
  }

  async findByCode(code: string): Promise<AccountingAccount | null> {
    return await this.repository.findOne({ where: { code } }) ?? null;
  }

  async findByCompanyId(companyId: string): Promise<AccountingAccount[]> {
    return await this.repository.find({ where: { companyId } });
  }

  async find(options?: any): Promise<AccountingAccount[]> {
    return await this.repository.find(options);
  }
}