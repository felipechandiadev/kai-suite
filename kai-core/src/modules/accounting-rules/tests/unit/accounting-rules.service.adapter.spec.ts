import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AccountingRulesServiceAdapter } from '@modules/accounting-rules/application/accounting-rules.service.adapter';
import { CreateAccountingRuleCommand } from '@modules/accounting-rules/application/commands/create-accounting-rule.command';
import { UpdateAccountingRuleCommand } from '@modules/accounting-rules/application/commands/update-accounting-rule.command';
import { DeactivateAccountingRuleCommand } from '@modules/accounting-rules/application/commands/deactivate-accounting-rule.command';
import { GetAccountingRulesQuery } from '@modules/accounting-rules/application/queries/get-accounting-rules.query';
import { GetAccountingRuleByIdQuery } from '@modules/accounting-rules/application/queries/get-accounting-rule-by-id.query';
import { GetAccountingRulesByTransactionTypeQuery } from '@modules/accounting-rules/application/queries/get-accounting-rules-by-transaction-type.query';

describe('AccountingRulesServiceAdapter', () => {
  let adapter: AccountingRulesServiceAdapter;
  let commandBus: { execute: jest.Mock };
  let queryBus: { execute: jest.Mock };

  beforeEach(() => {
    commandBus = { execute: jest.fn() };
    queryBus = { execute: jest.fn() };
    adapter = new AccountingRulesServiceAdapter(
      commandBus as unknown as CommandBus,
      queryBus as unknown as QueryBus,
    );
  });

  it('should dispatch create command', async () => {
    commandBus.execute.mockResolvedValueOnce({ id: 'rule-1' });

    const dto = {
      companyId: 'company-1',
      appliesTo: 'SALE',
      transactionType: 'SALE',
      expenseCategoryId: 'expense-1',
      taxId: 'tax-1',
      paymentMethod: 'cash',
      debitAccountId: 'debit-1',
      creditAccountId: 'credit-1',
      priority: 10,
      isActive: true,
    };

    const result = await adapter.create(dto);

    const command = commandBus.execute.mock.calls[0][0] as CreateAccountingRuleCommand;
    expect(command).toBeInstanceOf(CreateAccountingRuleCommand);
    expect(command).toMatchObject(dto);
    expect(result).toEqual({ id: 'rule-1' });
  });

  it('should dispatch read queries', async () => {
    queryBus.execute.mockResolvedValueOnce([{ id: 'rule-1' }]).mockResolvedValueOnce({ id: 'rule-2' });

    const all = await adapter.findAll('company-1');
    const byId = await adapter.findById('rule-2');

    expect(queryBus.execute.mock.calls[0][0]).toBeInstanceOf(GetAccountingRulesQuery);
    expect(queryBus.execute.mock.calls[0][0]).toMatchObject({ companyId: 'company-1' });
    expect(queryBus.execute.mock.calls[1][0]).toBeInstanceOf(GetAccountingRuleByIdQuery);
    expect(queryBus.execute.mock.calls[1][0]).toMatchObject({ id: 'rule-2' });
    expect(all).toEqual([{ id: 'rule-1' }]);
    expect(byId).toEqual({ id: 'rule-2' });
  });

  it('should dispatch update, deactivate and transactionType query', async () => {
    commandBus.execute.mockResolvedValueOnce({ id: 'rule-1' }).mockResolvedValueOnce(undefined);
    queryBus.execute.mockResolvedValueOnce([{ id: 'rule-1' }]);

    await adapter.update('rule-1', {
      expenseCategoryId: 'expense-1',
      taxId: 'tax-1',
      paymentMethod: 'cash',
      debitAccountId: 'debit-1',
      creditAccountId: 'credit-1',
      priority: 5,
      isActive: false,
    });
    await adapter.deactivate('rule-1');
    const result = await adapter.findByTransactionType('company-1', 'SALE');

    expect(commandBus.execute.mock.calls[0][0]).toBeInstanceOf(UpdateAccountingRuleCommand);
    expect(commandBus.execute.mock.calls[0][0]).toMatchObject({
      id: 'rule-1',
      expenseCategoryId: 'expense-1',
      taxId: 'tax-1',
      paymentMethod: 'cash',
      debitAccountId: 'debit-1',
      creditAccountId: 'credit-1',
      priority: 5,
      isActive: false,
    });
    expect(commandBus.execute.mock.calls[1][0]).toBeInstanceOf(DeactivateAccountingRuleCommand);
    expect(commandBus.execute.mock.calls[1][0]).toMatchObject({ id: 'rule-1' });
    expect(queryBus.execute.mock.calls[0][0]).toBeInstanceOf(GetAccountingRulesByTransactionTypeQuery);
    expect(queryBus.execute.mock.calls[0][0]).toMatchObject({
      companyId: 'company-1',
      transactionType: 'SALE',
    });
    expect(result).toEqual([{ id: 'rule-1' }]);
  });
});