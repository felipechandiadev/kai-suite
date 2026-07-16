import { BackorderRegistrationService } from '../../application/backorder-registration.service';

describe('BackorderRegistrationService', () => {
  const stockCommitment = {
    reserve: jest.fn().mockResolvedValue(undefined),
  };

  function build() {
    const lineSave = jest.fn(async (x) => x);
    const lineCreate = jest.fn((x) => x);
    const manager = {
      getRepository: jest.fn((entity: { name?: string }) => {
        const name = entity?.name ?? String(entity);
        if (name.includes('Transaction') && !name.includes('Line')) {
          return {
            create: jest.fn((x) => x),
            save: jest.fn(async (x) => ({ ...x, id: 'res-1' })),
          };
        }
        if (name.includes('TransactionLine')) {
          return {
            create: lineCreate,
            save: lineSave,
          };
        }
        return { create: jest.fn(), save: jest.fn() };
      }),
    };
    const dataSource = {
      transaction: jest.fn(async (fn: (m: typeof manager) => Promise<void>) => fn(manager)),
    };
    const service = new BackorderRegistrationService(
      dataSource as any,
      stockCommitment as any,
    );
    return { service, manager, stockCommitment, lineSave };
  }

  it('buildInitialBackorderMetadata defaults OPEN and zero deposit', () => {
    const { service } = build();
    expect(service.buildInitialBackorderMetadata()).toEqual({
      reservationStatus: 'OPEN',
      depositAmount: 0,
      depositConsumedAmount: 0,
    });
  });

  it('createStockReservationForBackorder reserves inventariable lines', async () => {
    const { service, stockCommitment, lineSave } = build();
    await service.createStockReservationForBackorder({
      companyId: 'co-1',
      branchId: 'br-1',
      storageId: 'st-1',
      customerId: 'cu-1',
      userId: 'us-1',
      backorderTransaction: { id: 'bo-1', documentNumber: 'ECG001' },
      lines: [
        {
          productId: 'p1',
          productVariantId: 'v1',
          productName: 'Prod',
          variantName: 'Var',
          quantity: 2,
          quantityInBase: 2,
          unitOfMeasure: 'UN',
        },
      ],
    });
    expect(stockCommitment.reserve).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        companyId: 'co-1',
        variantId: 'v1',
        storageId: 'st-1',
        qty: 2,
      }),
    );
    expect(lineSave).toHaveBeenCalledWith(
      expect.objectContaining({ companyId: 'co-1' }),
    );
  });

  it('throws when storageId missing', async () => {
    const { service } = build();
    await expect(
      service.createStockReservationForBackorder({
        companyId: 'co-1',
        branchId: 'br-1',
        storageId: undefined,
        customerId: 'cu-1',
        userId: 'us-1',
        backorderTransaction: { id: 'bo-1', documentNumber: 'ECG001' },
        lines: [{ productVariantId: 'v1', quantity: 1 } as any],
      }),
    ).rejects.toThrow(/almacén/);
  });
});
