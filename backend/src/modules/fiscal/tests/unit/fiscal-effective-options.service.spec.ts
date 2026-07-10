import { FiscalEffectiveOptionsService } from '../../application/fiscal-effective-options.service';
import { PosFolioAllocationService } from '../../application/pos-folio-allocation.service';
import { FiscalProfile } from '../../domain/fiscal-profile.entity';
import { FiscalCaf } from '../../domain/fiscal-caf.entity';
import { PointOfSale } from '@modules/points-of-sale/domain/point-of-sale.entity';
import { PointOfSaleFolioAllocation } from '../../domain/point-of-sale-folio-allocation.entity';
import { SiiEnvironment } from '../../domain/fiscal.enums';

describe('FiscalEffectiveOptionsService', () => {
  const companyId = 'company-1';
  const posId = 'pos-1';

  function makeService(input: {
    productionEnabled?: boolean;
    fiscalSettings?: { allowedDocumentKinds: string[]; defaultDocumentKind: string };
    caf?: FiscalCaf | null;
    allocation?: PointOfSaleFolioAllocation | null;
  }) {
    const posRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: posId,
        companyId,
        settings: { fiscal: input.fiscalSettings },
        deletedAt: null,
      } as unknown as PointOfSale),
    };
    const profileRepo = {
      findOne: jest.fn().mockResolvedValue({
        companyId,
        productionEnabled: input.productionEnabled ?? false,
      } as FiscalProfile),
    };
    const cafRepo = {
      findOne: jest.fn().mockResolvedValue(input.caf ?? null),
    };
    const allocationService = {
      listOrderedActiveForPos: jest.fn().mockResolvedValue(input.allocation ? [input.allocation] : []),
      getAvailableFoliosForPos: jest.fn().mockResolvedValue(
        input.allocation
          ? Math.max(0, input.allocation.rangeTo - input.allocation.nextFolio + 1)
          : 0,
      ),
    } as unknown as PosFolioAllocationService;

    return new FiscalEffectiveOptionsService(
      posRepo as never,
      profileRepo as never,
      cafRepo as never,
      allocationService,
    );
  }

  it('enables TICKET when allowed', async () => {
    const service = makeService({
      fiscalSettings: {
        allowedDocumentKinds: ['TICKET'],
        defaultDocumentKind: 'TICKET',
      },
    });
    const result = await service.resolveEffectiveDocumentOptions(companyId, posId);
    expect(result.options).toEqual([{ kind: 'TICKET', enabled: true }]);
    expect(result.defaultKind).toBe('TICKET');
  });

  it('disables BOLETA without production', async () => {
    const service = makeService({
      productionEnabled: false,
      fiscalSettings: {
        allowedDocumentKinds: ['TICKET', 'BOLETA'],
        defaultDocumentKind: 'TICKET',
      },
    });
    const result = await service.resolveEffectiveDocumentOptions(companyId, posId);
    const boleta = result.options.find((o) => o.kind === 'BOLETA');
    expect(boleta?.enabled).toBe(false);
    expect(boleta?.reason).toBe('NO_PRODUCTION');
  });

  it('enables BOLETA when production, CAF and allocation have folios', async () => {
    const service = makeService({
      productionEnabled: true,
      fiscalSettings: {
        allowedDocumentKinds: ['TICKET', 'BOLETA'],
        defaultDocumentKind: 'BOLETA',
      },
      caf: {
        id: 'caf-1',
        companyId,
        dteType: 39,
        environment: SiiEnvironment.PRODUCTION,
        isActive: true,
      } as FiscalCaf,
      allocation: {
        id: 'alloc-1',
        pointOfSaleId: posId,
        dteType: 39,
        rangeFrom: 10,
        rangeTo: 20,
        nextFolio: 10,
        isActive: true,
      } as PointOfSaleFolioAllocation,
    });
    const result = await service.resolveEffectiveDocumentOptions(companyId, posId);
    const boleta = result.options.find((o) => o.kind === 'BOLETA');
    expect(boleta?.enabled).toBe(true);
    expect(boleta?.availableFolios).toBe(11);
    expect(result.defaultKind).toBe('BOLETA');
  });

  it('marks FACTURA as not implemented', async () => {
    const service = makeService({
      fiscalSettings: {
        allowedDocumentKinds: ['TICKET', 'FACTURA'],
        defaultDocumentKind: 'TICKET',
      },
    });
    const result = await service.resolveEffectiveDocumentOptions(companyId, posId);
    const factura = result.options.find((o) => o.kind === 'FACTURA');
    expect(factura?.enabled).toBe(false);
    expect(factura?.reason).toBe('NO_IMPLEMENTADO');
  });
});
