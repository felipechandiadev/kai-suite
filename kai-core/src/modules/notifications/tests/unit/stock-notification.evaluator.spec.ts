import { Test, TestingModule } from '@nestjs/testing';
import { StockNotificationEvaluator } from '../../application/stock-notification.evaluator';
import { AudienceResolverService } from '../../application/audience-resolver.service';
import { NotificationDomain, StockNotificationKind } from '../../domain/notification.enums';

describe('StockNotificationEvaluator', () => {
  let evaluator: StockNotificationEvaluator;
  const audienceResolver = {
    stockDefaultAudiences: jest.fn().mockReturnValue([
      { audienceType: 'ROLES', audienceConfig: { roles: ['ADMIN'] } },
    ]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockNotificationEvaluator,
        { provide: AudienceResolverService, useValue: audienceResolver },
      ],
    }).compile();
    evaluator = module.get(StockNotificationEvaluator);
  });

  it('returns no commands when stock is within thresholds', () => {
    const cmds = evaluator.evaluate({
      companyId: 'c1',
      variant: {
        id: 'v1',
        minimumStock: 10,
        maximumStock: 100,
        reorderPoint: 20,
        product: { name: 'Aceite' },
      },
      stockLevel: {
        storageId: 's1',
        productVariantId: 'v1',
        physicalStock: 50,
        availableStock: 50,
        minimumStock: 10,
        maximumStock: 100,
        reorderPoint: 20,
      },
    });
    expect(cmds).toHaveLength(0);
  });

  it('emits below_minimum notification with group key', () => {
    const cmds = evaluator.evaluate({
      companyId: 'c1',
      variant: {
        id: 'v1',
        minimumStock: 10,
        product: { name: 'Filtro' },
      },
      stockLevel: {
        storageId: 's1',
        productVariantId: 'v1',
        physicalStock: 2,
        availableStock: 2,
        minimumStock: null,
      },
      transactionId: 'tx-1',
      storageName: 'Central',
      totalPhysicalStock: 2,
    });
    expect(cmds).toHaveLength(1);
    expect(cmds[0].domain).toBe(NotificationDomain.STOCK);
    expect(cmds[0].kind).toBe(StockNotificationKind.BELOW_MINIMUM);
    expect(cmds[0].groupKey).toBe(
      'stock:c1:variant:v1:stock.below_minimum',
    );
    expect(cmds[0].title).toContain('Filtro');
  });

  it('includes product name and variant attributes in payload', () => {
    const cmds = evaluator.evaluate({
      companyId: 'c1',
      variant: {
        id: 'v1',
        minimumStock: 10,
        product: { name: 'Aceite de oliva extra virgen' },
        attributeValues: { color: 'Verde', size: '1 L' },
      },
      stockLevel: {
        storageId: 's1',
        productVariantId: 'v1',
        physicalStock: 2,
        availableStock: 2,
        minimumStock: 10,
      },
      storageName: 'Bodega central',
    });
    expect(cmds[0].payload.productName).toBe('Aceite de oliva extra virgen');
    expect(cmds[0].payload.variantAttributes).toBe('Verde · 1 L');
    expect(cmds[0].body).toContain('Bodega central');
    expect(cmds[0].body).toContain('Verde · 1 L');
  });

  it('emits a single alert when stock is below minimum and reorder point', () => {
    const cmds = evaluator.evaluate({
      companyId: 'c1',
      variant: {
        id: 'v1',
        minimumStock: 10,
        reorderPoint: 5,
        product: { name: 'Filtro' },
      },
      stockLevel: {
        storageId: 's1',
        productVariantId: 'v1',
        physicalStock: 2,
        availableStock: 2,
        minimumStock: null,
        reorderPoint: null,
      },
      totalPhysicalStock: 2,
    });
    expect(cmds).toHaveLength(1);
    expect(cmds[0].kind).toBe(StockNotificationKind.BELOW_MINIMUM);
  });

  it('uses per-storage group key when storage minimum override is set', () => {
    const cmds = evaluator.evaluate({
      companyId: 'c1',
      variant: { id: 'v1', minimumStock: 80, product: { name: 'Aceite' } },
      stockLevel: {
        storageId: 'dep',
        productVariantId: 'v1',
        physicalStock: 0,
        availableStock: 0,
        minimumStock: 80,
      },
      storageName: 'Depósito principal',
      totalPhysicalStock: 200,
    });
    expect(cmds).toHaveLength(1);
    expect(cmds[0].groupKey).toBe('stock:c1:dep:v1:stock.below_minimum');
  });
});
