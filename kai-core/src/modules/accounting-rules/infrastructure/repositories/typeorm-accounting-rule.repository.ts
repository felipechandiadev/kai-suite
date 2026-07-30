import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountingRule } from '../../domain/accounting-rule.entity';
import { AccountingRuleRepositoryPort } from '../../application/ports/accounting-rule.repository.port';

@Injectable()
export class TypeOrmAccountingRuleRepository implements AccountingRuleRepositoryPort {
  constructor(
    @InjectRepository(AccountingRule)
    private readonly repository: Repository<AccountingRule>,
  ) {}

  async save(rule: AccountingRule): Promise<AccountingRule> {
    return this.repository.save(rule);
  }

  async findById(id: string): Promise<AccountingRule | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['debitAccount', 'creditAccount', 'tax', 'expenseCategory', 'lines', 'lines.account'],
    });
  }

  async findAll(companyId: string): Promise<AccountingRule[]> {
    return this.repository.find({
      where: { companyId, isActive: true },
      order: { priority: 'ASC' },
      relations: ['debitAccount', 'creditAccount', 'tax', 'expenseCategory', 'lines', 'lines.account'],
    });
  }

  async findByTransactionType(
    companyId: string,
    transactionType: string,
  ): Promise<AccountingRule[]> {
    return this.repository.find({
      where: { companyId, transactionType, isActive: true } as any,
      order: { priority: 'ASC' },
      relations: ['debitAccount', 'creditAccount', 'tax', 'expenseCategory', 'lines', 'lines.account'],
    });
  }

  async update(
    id: string,
    rule: Partial<AccountingRule>,
  ): Promise<AccountingRule> {
    await this.repository.update(id, rule as any);
    const updatedRule = await this.findById(id);
    if (!updatedRule) {
      throw new Error(`Accounting rule with id ${id} not found`);
    }
    return updatedRule;
  }

  async deactivate(id: string): Promise<void> {
    await this.repository.update(id, { isActive: false } as any);
  }
}
