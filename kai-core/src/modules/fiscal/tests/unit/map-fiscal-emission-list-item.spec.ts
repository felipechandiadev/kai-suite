import { PaymentMethod } from '@modules/transactions/domain/transaction.entity';
import { FiscalDteEmissionStatus, SiiEnvironment } from '../../domain/fiscal.enums';
import type { FiscalDteEmission } from '../../domain/fiscal-dte-emission.entity';
import { mapFiscalEmissionListItem } from '../../application/map-fiscal-emission-list-item';

describe('mapFiscalEmissionListItem', () => {
  const emission = {
    id: 'em-1',
    folio: 42,
    issuedAt: '2026-06-01',
    environment: SiiEnvironment.PRODUCTION,
    envioStatus: FiscalDteEmissionStatus.SENT,
    trackId: '123456789',
    transactionId: 'tx-1',
    receptorRut: '66666666-6',
    receptorName: 'Cliente genérico',
    tedXml: '<TED/>',
    errorDetail: null,
    updatedAt: new Date('2026-06-01T12:00:00.000Z'),
  } as FiscalDteEmission;

  it('maps emission with transaction and branch', () => {
    const item = mapFiscalEmissionListItem({
      emission,
      transaction: {
        id: 'tx-1',
        documentNumber: 'V-000123',
        documentFolio: '42',
        total: 11900,
        subtotal: 10000,
        taxAmount: 1900,
        discountAmount: 0,
        paymentMethod: PaymentMethod.CASH,
        createdAt: new Date('2026-06-01T11:30:00.000Z'),
        branchId: 'branch-1',
      } as never,
      branchName: 'Sucursal Centro',
    });

    expect(item.folio).toBe(42);
    expect(item.documentNumber).toBe('V-000123');
    expect(item.mntTotal).toBe(11900);
    expect(item.subtotal).toBe(10000);
    expect(item.taxAmount).toBe(1900);
    expect(item.paymentMethod).toBe(PaymentMethod.CASH);
    expect(item.branchName).toBe('Sucursal Centro');
    expect(item.hasTed).toBe(true);
    expect(item.errorMessage).toBeNull();
  });

  it('truncates long error messages', () => {
    const longMsg = 'x'.repeat(600);
    const item = mapFiscalEmissionListItem({
      emission: {
        ...emission,
        envioStatus: FiscalDteEmissionStatus.FAILED,
        tedXml: null,
        errorDetail: { message: longMsg },
      } as FiscalDteEmission,
      transaction: null,
      branchName: null,
    });

    expect(item.errorMessage).toHaveLength(500);
    expect(item.hasTed).toBe(false);
  });

  it('maps PENDING status and worker fields', () => {
    const item = mapFiscalEmissionListItem({
      emission: {
        ...emission,
        envioStatus: FiscalDteEmissionStatus.PENDING,
        submitAttempts: 2,
        nextRetryAt: new Date('2026-06-01T13:00:00.000Z'),
      } as FiscalDteEmission,
      transaction: null,
      branchName: null,
    });
    expect(item.envioStatus).toBe(FiscalDteEmissionStatus.PENDING);
    expect(item.submitAttempts).toBe(2);
    expect(item.nextRetryAt).toBe('2026-06-01T13:00:00.000Z');
  });
});
