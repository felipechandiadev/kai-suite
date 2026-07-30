import { PayQuotaHandler } from '../../application/handlers/pay-quota.handler';
import { PayQuotaCommand } from '../../application/commands/pay-quota.command';

describe('PayQuotaHandler', () => {
  it('applies payment to an existing payment record', async () => {
    const existing = { id: 'p1', paidAmount: 50 };
    const paymentsRepoMock = {
      getPaymentById: jest.fn(async (id) =>
        id === 'p1' ? { ...existing } : null,
      ),
      createPayment: jest.fn(async (p) => ({ ...p })),
    } as any;

    const handler = new PayQuotaHandler(paymentsRepoMock);
    const cmd = new PayQuotaCommand('p1', 25, 'user-x', 'CASH');
    const res = await handler.execute(cmd);

    expect(res).toBeDefined();
    expect(res.success).toBe(true);
    expect(paymentsRepoMock.getPaymentById).toHaveBeenCalledWith('p1');
    expect(paymentsRepoMock.createPayment).toHaveBeenCalled();
    expect(res.payment.paidAmount).toBe(75);
  });
});
