import { CreateMultiplePaymentsHandler } from '../../application/handlers/create-multiple-payments.handler';
import { CreateMultiplePaymentsCommand } from '../../application/commands/create-multiple-payments.command';

describe('CreateMultiplePaymentsHandler', () => {
  it('creates multiple payments via repository and returns created list', async () => {
    const paymentsSaved: any[] = [];
    const paymentsRepoMock = {
      createPayment: jest.fn(async (p) => {
        const saved = { id: Math.random().toString(36).slice(2), ...p };
        paymentsSaved.push(saved);
        return saved;
      }),
    } as any;

    const handler = new CreateMultiplePaymentsHandler(paymentsRepoMock, {
      publish: () => {},
    } as any);

    const cmd = new CreateMultiplePaymentsCommand(
      'sale-1',
      [{ amount: 100 }, { amount: 200 }],
      'user-1',
    );
    const res = await handler.execute(cmd);

    expect(res).toBeDefined();
    expect(res.success).toBe(true);
    expect(Array.isArray(res.payments)).toBe(true);
    expect(res.payments).toHaveLength(2);
    expect(paymentsRepoMock.createPayment).toHaveBeenCalledTimes(2);
    expect(res.payments[0].saleTransactionId).toBe('sale-1');
  });
});
