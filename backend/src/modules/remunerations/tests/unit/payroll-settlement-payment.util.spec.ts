import { PaymentStatus } from '@modules/transactions/domain/transaction.entity';
import {
  alignSettlementPaymentToNet,
  distributeClpAcross,
  resolvePayrollPaymentLines,
  shouldCreatePayrollPaymentChildren,
} from '@modules/remunerations/application/payroll-settlement-payment.util';

describe('distributeClpAcross', () => {
  it('reparte el resto en la última cuota', () => {
    expect(distributeClpAcross(100, 3)).toEqual([33, 33, 34]);
  });
});

describe('alignSettlementPaymentToNet', () => {
  it('reescribe cuotas PENDING_SCHEDULED al nuevo líquido', () => {
    const aligned = alignSettlementPaymentToNet(
      {
        mode: 'PENDING_SCHEDULED',
        paidLines: [],
        scheduledLines: [{ dueDate: '2026-07-31', amount: 528_000 }],
      },
      428_366,
    );
    expect(aligned.scheduledLines).toEqual([
      { dueDate: '2026-07-31', amount: 428_366 },
    ]);
  });

  it('no toca cuotas si ya suman el líquido', () => {
    const input = {
      mode: 'PENDING_SCHEDULED' as const,
      paidLines: [],
      scheduledLines: [{ dueDate: '2026-07-31', amount: 428_366 }],
    };
    expect(alignSettlementPaymentToNet(input, 428_366)).toBe(input);
  });

  it('reescribe pago COMPLETED al nuevo líquido', () => {
    const aligned = alignSettlementPaymentToNet(
      {
        mode: 'COMPLETED',
        paidLines: [
          {
            dueDate: '2026-07-20',
            amount: 528_000,
            paymentMethod: 'CASH',
            cashHubId: 'hub-1',
          },
        ],
        scheduledLines: [],
      },
      428_366,
    );
    expect(aligned.paidLines?.[0]?.amount).toBe(428_366);
  });
});

describe('resolvePayrollPaymentLines', () => {
  it('sin settlementPayment no crea cuotas (modo PENDING)', () => {
    const plan = resolvePayrollPaymentLines(undefined, 500_000, '2026-06-02');
    expect(plan.mode).toBe('PENDING');
    expect(plan.paidLines).toEqual([]);
    expect(plan.scheduledLines).toEqual([]);
    expect(plan.parentPaymentStatus).toBe(PaymentStatus.PENDING);
    expect(plan.parentAmountPaid).toBe(0);
  });

  it('modo inválido lanza error', () => {
    expect(() =>
      resolvePayrollPaymentLines(
        {
          mode: 'PAGO_PENDIENTE' as any,
          paidLines: [],
          scheduledLines: [],
        },
        500_000,
        '2026-06-02',
      ),
    ).toThrow();
  });

  it('shouldCreatePayrollPaymentChildren es false en PENDING', () => {
    expect(
      shouldCreatePayrollPaymentChildren({
        mode: 'PENDING',
        paidLines: [{ dueDate: '2026-06-02', amount: 900_000 }],
        scheduledLines: [],
      }),
    ).toBe(false);
  });

  it('shouldCreatePayrollPaymentChildren es true en PENDING_SCHEDULED con cuotas', () => {
    expect(
      shouldCreatePayrollPaymentChildren({
        mode: 'PENDING_SCHEDULED',
        paidLines: [],
        scheduledLines: [{ dueDate: '2026-06-02', amount: 900_000 }],
      }),
    ).toBe(true);
  });

  it('modo PENDING no incluye líneas aunque vengan en el payload', () => {
    const plan = resolvePayrollPaymentLines(
      {
        mode: 'PENDING',
        paidLines: [{ dueDate: '2026-06-02', amount: 100 }],
        scheduledLines: [{ dueDate: '2026-06-02', amount: 400_000 }],
      },
      500_000,
      '2026-06-02',
    );
    expect(plan.mode).toBe('PENDING');
    expect(plan.paidLines).toEqual([]);
    expect(plan.scheduledLines).toEqual([]);
  });

  it('tras alinear, PENDING_SCHEDULED valida contra el líquido sugerido', () => {
    const aligned = alignSettlementPaymentToNet(
      {
        mode: 'PENDING_SCHEDULED',
        paidLines: [],
        scheduledLines: [{ dueDate: '2026-07-31', amount: 528_000 }],
      },
      428_366,
    );
    const plan = resolvePayrollPaymentLines(aligned, 428_366, '2026-07-20');
    expect(plan.scheduledLines[0]?.amount).toBe(428_366);
  });
});
