import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { AccountingRule } from '../../domain/accounting-rule.entity';
import { AccountingRuleRepositoryPort } from '../ports/accounting-rule.repository.port';
import { GetAccountingRuleByIdQuery } from './get-accounting-rule-by-id.query';

@QueryHandler(GetAccountingRuleByIdQuery)
export class GetAccountingRuleByIdHandler implements IQueryHandler<GetAccountingRuleByIdQuery> {
  async execute(
    query: GetAccountingRuleByIdQuery,
  ): Promise<AccountingRule | null> {
    return this.repository.findById(query.id);
  }

  constructor(
    @Inject('AccountingRuleRepositoryPort')
    private readonly repository: AccountingRuleRepositoryPort,
  ) {}
}
