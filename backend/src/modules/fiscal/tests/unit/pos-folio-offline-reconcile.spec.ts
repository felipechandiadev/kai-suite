import { ConflictException } from '@nestjs/common';
import { PosFolioAllocationService } from '@modules/fiscal/application/pos-folio-allocation.service';
import { PointOfSaleFolioAllocation } from '@modules/fiscal/domain/point-of-sale-folio-allocation.entity';

describe('PosFolioAllocationService.reconcileOfflineFolioInManager', () => {
  it('avanza nextFolio a max(actual, folio+1)', async () => {
    const allocation: PointOfSaleFolioAllocation = {
      id: 'alloc-1',
      companyId: 'co-1',
      cafId: 'caf-1',
      subPackCode: 'SUB-001',
      pointOfSaleId: 'pos-1',
      dteType: 39,
      rangeFrom: 500,
      rangeTo: 520,
      nextFolio: 501,
      environment: 'production',
      isActive: true,
    } as PointOfSaleFolioAllocation;

    const repo = {
      findOne: jest.fn().mockResolvedValue({ ...allocation }),
      save: jest.fn().mockImplementation(async (row) => row),
    };
    const manager = {
      getRepository: jest.fn().mockReturnValue(repo),
    };

    const service = Object.create(PosFolioAllocationService.prototype) as PosFolioAllocationService;
    await service.reconcileOfflineFolioInManager(manager as any, 'alloc-1', 'caf-1', 501);

    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ nextFolio: 502 }),
    );
  });

  it('folio fuera de rango lanza ConflictException', async () => {
    const allocation: PointOfSaleFolioAllocation = {
      id: 'alloc-1',
      cafId: 'caf-1',
      rangeFrom: 500,
      rangeTo: 520,
      nextFolio: 500,
      isActive: true,
    } as PointOfSaleFolioAllocation;

    const manager = {
      getRepository: jest.fn().mockReturnValue({
        findOne: jest.fn().mockResolvedValue(allocation),
        save: jest.fn(),
      }),
    };

    const service = Object.create(PosFolioAllocationService.prototype) as PosFolioAllocationService;
    await expect(
      service.reconcileOfflineFolioInManager(manager as any, 'alloc-1', 'caf-1', 530),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

/**
 * QA manual POS offline MVP:
 * 1. Sin red → venta efectivo/tarjeta + boleta con folio del rango POS.
 * 2. Sin folios → solo ticket interno, mensaje claro.
 * 3. Reconexión → una venta por clientOperationId en admin.
 * 4. Otro POS no usa folios del rango ajeno.
 * 5. nextFolio servidor coherente tras sync.
 * 6. Emisión PENDING → worker SII al tener red.
 * 7. Topbar muestra offline + contador cola; distinto de icono impresora.
 */
