import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { PaymentsServiceAdapter } from '@modules/payments/application/payments.service.adapter';
import { CreateMultiplePaymentsCommand } from '@modules/payments/application/commands/create-multiple-payments.command';
import { PayQuotaCommand } from '@modules/payments/application/commands/pay-quota.command';

describe('PaymentsServiceAdapter', () => {
  let adapter: PaymentsServiceAdapter;
  let commandBus: { execute: jest.Mock };
  let queryBus: QueryBus;

  beforeEach(() => {
    commandBus = { execute: jest.fn() };
    queryBus = {} as QueryBus;
    adapter = new PaymentsServiceAdapter(commandBus as unknown as CommandBus, queryBus);
  });

  it('should dispatch createMultiplePayments command', async () => {
    commandBus.execute.mockResolvedValueOnce({ ok: true });

    const result = await adapter.createMultiplePayments(
      { saleTransactionId: 'sale-1', payments: [{ amount: 100 }] },
      'user-1',
    );

    const command = commandBus.execute.mock.calls[0][0] as CreateMultiplePaymentsCommand;
    expect(command).toBeInstanceOf(CreateMultiplePaymentsCommand);
    expect(command).toMatchObject({
      saleTransactionId: 'sale-1',
      payments: [{ amount: 100 }],
      userId: 'user-1',
    });
    expect(result).toEqual({ ok: true });
  });

  it('should validate createMultiplePayments payload', async () => {
    await expect(
      adapter.createMultiplePayments({ saleTransactionId: '', payments: [] }, 'user-1'),
    ).rejects.toThrow('saleTransactionId required');

    await expect(
      adapter.createMultiplePayments({ saleTransactionId: 'sale-1', payments: [] }, 'user-1'),
    ).rejects.toThrow('payments required');
  });

  it('should dispatch payQuota command', async () => {
    commandBus.execute.mockResolvedValueOnce({ ok: true });

    const result = await adapter.payQuota(
      { paymentId: 'payment-1', amount: 50, method: 'cash' },
      'user-1',
    );

    const command = commandBus.execute.mock.calls[0][0] as PayQuotaCommand;
    expect(command).toBeInstanceOf(PayQuotaCommand);
    expect(command).toMatchObject({
      paymentId: 'payment-1',
      amount: 50,
      userId: 'user-1',
      method: 'cash',
    });
    expect(result).toEqual({ ok: true });
  });

  it('should validate payQuota payload', async () => {
    await expect(adapter.payQuota({ amount: 10 }, 'user-1')).rejects.toThrow('paymentId required');
    await expect(adapter.payQuota({ paymentId: 'payment-1', amount: 0 }, 'user-1')).rejects.toThrow(
      'amount must be > 0',
    );
  });
});