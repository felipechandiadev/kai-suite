import { BadRequestException, ConflictException } from '@nestjs/common';
import { SalesFromSessionService } from '../../application/sales-from-session.service';
import { CashSessionStatus } from '../../domain/cash-session.entity';
import {
  PromotionActivation,
  PromotionAuthorization,
  PromotionType,
} from '../../../promotions/domain/promotion.enums';
import type { EffectivePromotion } from '../../../promotions/application/discount-engine.types';

/**
 * Tests del bloque PR 5 dentro de `SalesFromSessionService.createSale`:
 *
 *   - `BadRequestException` cuando el snapshot del cliente no coincide
 *     con el cálculo canónico del servidor (epsilon = 1).
 *   - `ConflictException` cuando una promoción `maxUsesTotal = 1` ya fue
 *     consumida concurrentemente (la UPDATE devuelve 0 filas).
 *
 * Se mockea el `dataSource.transaction` para entregar un `manager` con
 * los repositorios mínimos que la ruta de promociones necesita; el
 * resto del flujo (createTransaction, paymentSnapshots) se sustituye
 * por stubs.
 */
describe('SalesFromSessionService — PR5 promotions integration', () => {
  const companyId = 'company-1';
  const branchId = 'branch-1';
  const pointOfSaleId = 'pos-1';
  const cashSessionId = 'session-1';

  const buildEffectivePromotion = (
    overrides: Partial<EffectivePromotion> = {},
  ): EffectivePromotion => ({
    id: 'promo-1',
    code: 'PROMO10',
    name: '10% off',
    type: PromotionType.PERCENT_ON_LINE,
    value: 10,
    maxValue: null,
    validFrom: null,
    validUntil: null,
    activation: PromotionActivation.AUTO,
    redemptionCode: null,
    stackable: true,
    priority: 0,
    minSubtotal: null,
    minQuantity: null,
    daysOfWeek: null,
    hourFrom: null,
    hourTo: null,
    maxUsesTotal: null,
    maxUsesPerCustomer: null,
    usesCount: 0,
    authorization: PromotionAuthorization.NONE,
    authorizationLimitPct: null,
    buyQuantity: null,
    getQuantity: null,
    getDiscountPercent: null,
    accountingTag: null,
    scopes: {
      branches: [],
      pointsOfSale: [],
      products: [],
      variants: [],
      categories: [],
      customers: [],
      paymentMethods: [],
    },
    ...overrides,
  });

  function buildService(opts: {
    effective: EffectivePromotion[];
    updateRowsByPromotion: Record<string, number>;
    createTransactionMock?: jest.Mock;
  }) {
    const updateCalls: string[] = [];
    const insertedRedemptions: any[] = [];
    const decrementCalls: string[] = [];

    const productVariant = {
      id: 'variant-1',
      productId: 'product-1',
      sku: 'SKU-1',
      baseCost: 0,
      saleUnitId: 'unit-1',
      unitId: 'unit-1',
      stockBaseUnitId: 'unit-1',
      purchaseUnitId: 'unit-1',
      product: {
        id: 'product-1',
        name: 'Camiseta',
        categoryId: 'cat-1',
      },
    };

    const manager = {
      getRepository: (entityClass: any) => {
        const name =
          typeof entityClass === 'function' ? entityClass.name : entityClass;
        if (name === 'User') {
          return {
            findOne: jest
              .fn()
              .mockResolvedValue({ id: 'user-1', userName: 'cashier' }),
          };
        }
        if (name === 'PointOfSale') {
          return {
            findOne: jest.fn().mockResolvedValue({
              id: pointOfSaleId,
              companyId,
              branchId,
            }),
          };
        }
        if (name === 'CashSession') {
          return {
            findOne: jest.fn().mockResolvedValue({
              id: cashSessionId,
              status: CashSessionStatus.OPEN,
              openingAmount: 0,
              expectedAmount: 0,
            }),
            save: jest.fn().mockResolvedValue(undefined),
          };
        }
        if (name === 'ProductVariant') {
          return {
            findOne: jest.fn().mockResolvedValue(productVariant),
          };
        }
        if (name === 'Unit') {
          return {
            find: jest.fn().mockResolvedValue([
              {
                id: 'unit-1',
                companyId,
                isBase: true,
                baseUnitId: null,
                conversionFactor: 1,
                dimension: 'COUNT',
              },
            ]),
          };
        }
        if (name === 'Storage') {
          return {
            findOne: jest.fn().mockResolvedValue({
              id: 'storage-default-1',
              branchId,
              name: 'Principal',
              isDefault: true,
              isActive: true,
            }),
          };
        }
        if (name === 'PromotionRedemption') {
          return {
            insert: jest.fn().mockImplementation((row: any) => {
              insertedRedemptions.push(row);
              return Promise.resolve();
            }),
          };
        }
        return { findOne: jest.fn(), save: jest.fn(), insert: jest.fn() };
      },
      query: jest.fn().mockImplementation((sql: string, params: any[]) => {
        if (
          /UPDATE promotions[\s\S]+uses_count = uses_count \+ 1/i.test(sql)
        ) {
          updateCalls.push(params[0]);
          const rows = opts.updateRowsByPromotion[params[0]] ?? 1;
          return Promise.resolve(rows > 0 ? [{ id: params[0] }] : []);
        }
        if (
          /UPDATE promotions[\s\S]+uses_count = GREATEST/i.test(sql)
        ) {
          decrementCalls.push(params[0]);
          return Promise.resolve(undefined);
        }
        if (/SELECT promotion_id, COUNT/i.test(sql)) {
          return Promise.resolve([]);
        }
        return Promise.resolve([]);
      }),
    };

    const dataSource = {
      transaction: jest.fn().mockImplementation(async (cb: any) => cb(manager)),
    };

    const promotionsService = {
      findEffective: jest.fn().mockResolvedValue(opts.effective),
    };

    const transactionsService = {
      createTransaction:
        opts.createTransactionMock ??
        jest.fn().mockResolvedValue({
          id: 'tx-1',
          documentNumber: 'COM-001',
          transactionType: 'SALE',
          total: 0,
          status: 'CONFIRMED',
          createdAt: new Date(),
          paymentMethod: 'CASH',
        }),
    };

    const companiesService = {
      getPaymentMethods: jest.fn().mockResolvedValue([]),
    };

    const variantQuantityConversion = {
      toVariantStockBaseSync: jest.fn().mockReturnValue({
        quantityInBase: 1,
        unitConversionFactor: 1,
        unitOfMeasure: 'u',
      }),
      validateVariantUomTripletAsync: jest.fn().mockResolvedValue(undefined),
      enrichCreateTransactionDto: jest.fn().mockResolvedValue(undefined),
    };

    const service = new SalesFromSessionService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      dataSource as any,
      transactionsService as any,
      companiesService as any,
      promotionsService as any,
      variantQuantityConversion as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { fiscalEmission: { boletaAsyncEmit: false } } as any,
    );

    return {
      service,
      manager,
      promotionsService,
      transactionsService,
      updateCalls,
      decrementCalls,
      insertedRedemptions,
    };
  }

  it('throws BadRequestException when client snapshot diverges from server', async () => {
    const { service, transactionsService } = buildService({
      effective: [buildEffectivePromotion()],
      updateRowsByPromotion: { 'promo-1': 1 },
    });

    await expect(
      service.createSale({
        userName: 'cashier',
        pointOfSaleId,
        cashSessionId,
        paymentMethod: 'CASH',
        lines: [
          {
            productVariantId: 'variant-1',
            quantity: 1,
            unitPrice: 1000,
          },
        ],
        payments: [{ paymentMethod: 'CASH', amount: 900 }],
        amountPaid: 900,
        // El cliente reporta 500 de descuento, pero el motor canónico
        // calcula 100 (10% sobre 1000).
        promotionSnapshot: [
          {
            promotionId: 'promo-1',
            promotionCode: 'PROMO10',
            promotionName: '10% off',
            type: 'PERCENT_ON_LINE',
            activation: 'AUTO',
            authorization: 'NONE',
            amountDiscounted: 500,
            affectedLineIds: ['srv-0'],
          },
        ],
      }),
    ).rejects.toThrow(BadRequestException);

    expect(transactionsService.createTransaction).not.toHaveBeenCalled();
  });

  it('throws ConflictException when uses_count UPDATE returns no rows', async () => {
    const { service, transactionsService, decrementCalls } = buildService({
      effective: [
        buildEffectivePromotion({ id: 'promo-1', maxUsesTotal: 1, usesCount: 0 }),
      ],
      // Simula que en el commit otro cajero ya consumió la última unidad
      // disponible y la UPDATE no devuelve filas.
      updateRowsByPromotion: { 'promo-1': 0 },
    });

    await expect(
      service.createSale({
        userName: 'cashier',
        pointOfSaleId,
        cashSessionId,
        paymentMethod: 'CASH',
        lines: [
          { productVariantId: 'variant-1', quantity: 1, unitPrice: 1000 },
        ],
        payments: [{ paymentMethod: 'CASH', amount: 900 }],
        amountPaid: 900,
        promotionSnapshot: [
          {
            promotionId: 'promo-1',
            promotionCode: 'PROMO10',
            promotionName: '10% off',
            type: 'PERCENT_ON_LINE',
            activation: 'AUTO',
            authorization: 'NONE',
            amountDiscounted: 100,
            affectedLineIds: ['srv-0'],
          },
        ],
      }),
    ).rejects.toThrow(ConflictException);

    // No se llega a crear la transacción.
    expect(transactionsService.createTransaction).not.toHaveBeenCalled();
    // No hubo reservas previas que compensar.
    expect(decrementCalls).toHaveLength(0);
  });

  it('persists redemption snapshot when validation passes', async () => {
    const { service, insertedRedemptions, transactionsService, updateCalls } =
      buildService({
        effective: [buildEffectivePromotion()],
        updateRowsByPromotion: { 'promo-1': 1 },
      });

    await service.createSale({
      userName: 'cashier',
      pointOfSaleId,
      cashSessionId,
      paymentMethod: 'CASH',
      lines: [
        { productVariantId: 'variant-1', quantity: 1, unitPrice: 1000 },
      ],
      payments: [{ paymentMethod: 'CASH', amount: 900 }],
      amountPaid: 900,
      promotionSnapshot: [
        {
          promotionId: 'promo-1',
          promotionCode: 'PROMO10',
          promotionName: '10% off',
          type: 'PERCENT_ON_LINE',
          activation: 'AUTO',
          authorization: 'NONE',
          amountDiscounted: 100,
          affectedLineIds: ['srv-0'],
        },
      ],
    });

    expect(transactionsService.createTransaction).toHaveBeenCalledTimes(1);
    expect(updateCalls).toEqual(['promo-1']);
    expect(insertedRedemptions).toHaveLength(1);
    expect(insertedRedemptions[0]).toEqual(
      expect.objectContaining({
        companyId,
        promotionId: 'promo-1',
        transactionId: 'tx-1',
        amountDiscounted: 100,
      }),
    );
  });

  it('compensates reserved uses_count when createTransaction fails', async () => {
    const failingCreate = jest
      .fn()
      .mockRejectedValue(new Error('Saldo cliente excedido'));

    const { service, decrementCalls } = buildService({
      effective: [buildEffectivePromotion()],
      updateRowsByPromotion: { 'promo-1': 1 },
      createTransactionMock: failingCreate,
    });

    await expect(
      service.createSale({
        userName: 'cashier',
        pointOfSaleId,
        cashSessionId,
        paymentMethod: 'CASH',
        lines: [
          { productVariantId: 'variant-1', quantity: 1, unitPrice: 1000 },
        ],
        payments: [{ paymentMethod: 'CASH', amount: 900 }],
        amountPaid: 900,
        promotionSnapshot: [
          {
            promotionId: 'promo-1',
            promotionCode: 'PROMO10',
            promotionName: '10% off',
            type: 'PERCENT_ON_LINE',
            activation: 'AUTO',
            authorization: 'NONE',
            amountDiscounted: 100,
            affectedLineIds: ['srv-0'],
          },
        ],
      }),
    ).rejects.toThrow('Saldo cliente excedido');

    expect(decrementCalls).toEqual(['promo-1']);
  });
});
