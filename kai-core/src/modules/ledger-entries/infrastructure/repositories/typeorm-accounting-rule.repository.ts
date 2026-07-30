import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountingRuleRepositoryPort } from '../../application/ports/accounting-rule.repository.port';
import { AccountingRule, RuleScope } from '@modules/accounting-rules/domain/accounting-rule.entity';
import { TransactionType } from '@modules/transactions/domain/transaction.entity';

@Injectable()
export class TypeOrmAccountingRuleRepository implements AccountingRuleRepositoryPort {
  constructor(
    @InjectRepository(AccountingRule)
    private readonly repository: Repository<AccountingRule>,
  ) {}

  async findById(id: string): Promise<AccountingRule | null> {
    return await this.repository.findOne({ where: { id } }) ?? null;
  }

  async findByScope(scope: string): Promise<AccountingRule[]> {
    return await this.repository.find({ where: { appliesTo: scope as RuleScope } });
  }

  async findByTransactionType(transactionType: string): Promise<AccountingRule[]> {
    return await this.repository.find({ where: { transactionType: transactionType as TransactionType } });
  }

  async findAll(): Promise<AccountingRule[]> {
    return await this.repository.find();
  }

  async find(options?: any): Promise<AccountingRule[]> {
    return await this.repository.find(options);
  }
}