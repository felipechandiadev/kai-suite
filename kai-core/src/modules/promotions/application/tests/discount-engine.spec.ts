import {
  PromotionActivation,
  PromotionAuthorization,
  PromotionScopeMode,
  PromotionType,
} from '../../domain/promotion.enums';
import { applyPromotions } from '../discount-engine';
import {
  applyPromotionsAutoSelected,
  ctxDefault,
  FIXTURE_BRANCH_ID,
  FIXTURE_CATEGORY_ID,
  FIXTURE_CUSTOMER_ID,
  FIXTURE_OTHER_CATEGORY_ID,
  FIXTURE_OTHER_PRODUCT_ID,
  FIXTURE_OTHER_VARIANT_ID,
  FIXTURE_PAYMENT_METHOD_CARD,
  FIXTURE_PAYMENT_METHOD_CASH,
  FIXTURE_POS_ID,
  FIXTURE_PRODUCT_ID,
  fixedNow,
  lineNecklace,
  lineRing,
  promo,
} from './discount-engine.fixtures';

describe('discount-engine — PromotionType', () => {
  it('PERCENT_ON_LINE descuenta el porcentaje del subtotal de la línea elegible', () => {
    const result = applyPromotionsAutoSelected({
      cart: { lines: [lineRing()], customerId: null, paymentMethodIds: [] },
      ctx: ctxDefault(),
      promotions: [promo({ type: PromotionType.PERCENT_ON_LINE, value: 15 })],
      manualSelections: [],
      customerHistory: [],
    });
    expect(result.resolvedLines[0].discount?.discountAmount).toBe(15_000);
    expect(result.resolvedLines[0].discount?.discountPercentage).toBe(15);
    expect(result.appliedPromotions).toHaveLength(1);
  });

  it('AMOUNT_ON_LINE descuenta monto fijo cuando hay capacidad', () => {
    const result = applyPromotionsAutoSelected({
      cart: { lines: [lineRing()], customerId: null, paymentMethodIds: [] },
      ctx: ctxDefault(),
      promotions: [promo({ type: PromotionType.AMOUNT_ON_LINE, value: 20_000 })],
      manualSelections: [],
      customerHistory: [],
    });
    expect(result.resolvedLines[0].discount?.discountAmount).toBe(20_000);
  });

  it('AMOUNT_ON_LINE se trunca al subtotal cuando excede', () => {
    const result = applyPromotionsAutoSelected({
      cart: { lines: [lineRing({ unitPrice: 5_000 })], customerId: null, paymentMethodIds: [] },
      ctx: ctxDefault(),
      promotions: [promo({ type: PromotionType.AMOUNT_ON_LINE, value: 50_000 })],
      manualSelections: [],
      customerHistory: [],
    });
    expect(result.resolvedLines[0].discount?.discountAmount).toBe(5_000);
  });

  it('PERCENT_ON_ORDER aplica al subtotal neto post-descuentos de línea', () => {
    const result = applyPromotionsAutoSelected({
      cart: {
        lines: [lineRing({ unitPrice: 100_000 })],
        customerId: null,
        paymentMethodIds: [],
      },
      ctx: ctxDefault(),
      promotions: [
        promo({
          id: 'P1',
          code: 'P1',
          type: PromotionType.PERCENT_ON_LINE,
          value: 50,
          priority: 100,
        }),
        promo({
          id: 'P2',
          code: 'P2',
          type: PromotionType.PERCENT_ON_ORDER,
          value: 10,
          priority: 50,
        }),
      ],
      manualSelections: [],
      customerHistory: [],
    });
    expect(result.resolvedLines[0].discount?.discountAmount).toBe(50_000);
    expect(result.orderDiscountAmount).toBe(5_000);
  });

  it('AMOUNT_ON_ORDER aplica monto fijo de orden', () => {
    const result = applyPromotionsAutoSelected({
      cart: { lines: [lineRing()], customerId: null, paymentMethodIds: [] },
      ctx: ctxDefault(),
      promotions: [promo({ type: PromotionType.AMOUNT_ON_ORDER, value: 7_000 })],
      manualSelections: [],
      customerHistory: [],
    });
    expect(result.orderDiscountAmount).toBe(7_000);
  });

  it('PRICE_OVERRIDE fuerza unitPrice y emite descuento equivalente', () => {
    const result = applyPromotionsAutoSelected({
      cart: {
        lines: [lineRing({ unitPrice: 100_000, quantity: 3 })],
        customerId: null,
        paymentMethodIds: [],
      },
      ctx: ctxDefault(),
      promotions: [promo({ type: PromotionType.PRICE_OVERRIDE, value: 80_000 })],
      manualSelections: [],
      customerHistory: [],
    });
    const d = result.resolvedLines[0].discount!;
    expect(d.overridesUnitPrice).toBe(true);
    expect(d.newUnitPrice).toBe(80_000);
    expect(d.discountAmount).toBe(60_000);
  });

  it('PRICE_OVERRIDE descarta si el "nuevo precio" es ≥ al actual', () => {
    const result = applyPromotionsAutoSelected({
      cart: {
        lines: [lineRing({ unitPrice: 100_000 })],
        customerId: null,
        paymentMethodIds: [],
      },
      ctx: ctxDefault(),
      promotions: [promo({ type: PromotionType.PRICE_OVERRIDE, value: 150_000 })],
      manualSelections: [],
      customerHistory: [],
    });
    expect(result.resolvedLines[0].discount).toBeNull();
  });

  it('BUY_X_GET_Y: 2x1 con 4 unidades regala 2', () => {
    const result = applyPromotionsAutoSelected({
      cart: {
        lines: [lineRing({ quantity: 4, unitPrice: 10_000 })],
        customerId: null,
        paymentMethodIds: [],
      },
      ctx: ctxDefault(),
      promotions: [
        promo({
          type: PromotionType.BUY_X_GET_Y,
          buyQuantity: 1,
          getQuantity: 1,
          getDiscountPercent: 100,
        }),
      ],
      manualSelections: [],
      customerHistory: [],
    });
    expect(result.resolvedLines[0].discount?.discountAmount).toBe(20_000);
    expect(result.resolvedLines[0].discount?.appliedQuantity).toBe(2);
  });

  it('BUY_X_GET_Y: con 3 unidades y 2x1 sólo aplica 1 bloque (regala 1)', () => {
    const result = applyPromotionsAutoSelected({
      cart: {
        lines: [lineRing({ quantity: 3, unitPrice: 10_000 })],
        customerId: null,
        paymentMethodIds: [],
      },
      ctx: ctxDefault(),
      promotions: [
        promo({
          type: PromotionType.BUY_X_GET_Y,
          buyQuantity: 1,
          getQuantity: 1,
          getDiscountPercent: 100,
        }),
      ],
      manualSelections: [],
      customerHistory: [],
    });
    expect(result.resolvedLines[0].discount?.discountAmount).toBe(10_000);
  });

  it('BUY_X_GET_Y: con 1 unidad no aplica', () => {
    const result = applyPromotionsAutoSelected({
      cart: {
        lines: [lineRing({ quantity: 1, unitPrice: 10_000 })],
        customerId: null,
        paymentMethodIds: [],
      },
      ctx: ctxDefault(),
      promotions: [
        promo({
          type: PromotionType.BUY_X_GET_Y,
          buyQuantity: 1,
          getQuantity: 1,
          getDiscountPercent: 100,
        }),
      ],
      manualSelections: [],
      customerHistory: [],
    });
    expect(result.resolvedLines[0].discount).toBeNull();
  });
});

describe('discount-engine — vigencia', () => {
  it('validUntil pasado descarta la promoción', () => {
    const result = applyPromotionsAutoSelected({
      cart: { lines: [lineRing()], customerId: null, paymentMethodIds: [] },
      ctx: ctxDefault(),
      promotions: [promo({ validUntil: new Date('2025-01-01T00:00:00.000Z') })],
      manualSelections: [],
      customerHistory: [],
    });
    expect(result.appliedPromotions).toHaveLength(0);
  });

  it('validFrom futuro descarta la promoción', () => {
    const result = applyPromotionsAutoSelected({
      cart: { lines: [lineRing()], customerId: null, paymentMethodIds: [] },
      ctx: ctxDefault(),
      promotions: [promo({ validFrom: new Date('2999-01-01T00:00:00.000Z') })],
      manualSelections: [],
      customerHistory: [],
    });
    expect(result.appliedPromotions).toHaveLength(0);
  });

  it('vencimiento próximo (<= 3 días) genera warning', () => {
    const result = applyPromotionsAutoSelected({
      cart: { lines: [lineRing()], customerId: null, paymentMethodIds: [] },
      ctx: ctxDefault(),
      promotions: [
        promo({
          validUntil: new Date(fixedNow().getTime() + 1000 * 60 * 60 * 24), // +1 día
        }),
      ],
      manualSelections: [],
      customerHistory: [],
    });
    expect(result.warnings.some((w) => w.code === 'EXPIRING_SOON')).toBe(true);
  });
});

describe('discount-engine — stacking y prioridad', () => {
  it('una línea sólo recibe una promoción de línea (gana mayor priority)', () => {
    const result = applyPromotionsAutoSelected({
      cart: { lines: [lineRing()], customerId: null, paymentMethodIds: [] },
      ctx: ctxDefault(),
      promotions: [
        promo({ id: 'A', code: 'A', value: 5, priority: 1 }),
        promo({ id: 'B', code: 'B', value: 20, priority: 100 }),
      ],
      manualSelections: [],
      customerHistory: [],
    });
    expect(result.resolvedLines[0].discount?.promotionId).toBe('B');
  });

  it('promociones de orden stackable se suman', () => {
    const result = applyPromotionsAutoSelected({
      cart: { lines: [lineRing()], customerId: null, paymentMethodIds: [] },
      ctx: ctxDefault(),
      promotions: [
        promo({ id: 'O1', code: 'O1', type: PromotionType.PERCENT_ON_ORDER, value: 10 }),
        promo({ id: 'O2', code: 'O2', type: PromotionType.AMOUNT_ON_ORDER, value: 1_000 }),
      ],
      manualSelections: [],
      customerHistory: [],
    });
    expect(result.orderDiscountAmount).toBe(11_000);
    expect(result.appliedPromotions).toHaveLength(2);
  });

  it('promoción de orden no-stackable bloquea otras de orden con menor priority', () => {
    const result = applyPromotionsAutoSelected({
      cart: { lines: [lineRing()], customerId: null, paymentMethodIds: [] },
      ctx: ctxDefault(),
      promotions: [
        promo({
          id: 'EXC',
          code: 'EXC',
          type: PromotionType.PERCENT_ON_ORDER,
          value: 20,
          stackable: false,
          priority: 100,
        }),
        promo({
          id: 'STK',
          code: 'STK',
          type: PromotionType.PERCENT_ON_ORDER,
          value: 5,
          priority: 50,
        }),
      ],
      manualSelections: [],
      customerHistory: [],
    });
    expect(result.appliedPromotions).toHaveLength(1);
    expect(result.appliedPromotions[0].promotionId).toBe('EXC');
    expect(result.orderDiscountAmount).toBe(20_000);
  });
});

describe('discount-engine — autorización y maxValue', () => {
  it('authorizationLimitPct con CASHIER recorta el porcentaje a tope', () => {
    const result = applyPromotionsAutoSelected({
      cart: { lines: [lineRing()], customerId: null, paymentMethodIds: [] },
      ctx: ctxDefault(),
      promotions: [
        promo({
          value: 20,
          authorization: PromotionAuthorization.CASHIER,
          authorizationLimitPct: 5,
        }),
      ],
      manualSelections: [],
      customerHistory: [],
    });
    expect(result.resolvedLines[0].discount?.discountPercentage).toBe(5);
    expect(result.warnings.some((w) => w.code === 'CASHIER_LIMIT_APPLIED')).toBe(true);
  });

  it('maxValue tope absoluto al monto descontado por línea', () => {
    const result = applyPromotionsAutoSelected({
      cart: { lines: [lineRing({ unitPrice: 100_000, quantity: 2 })], customerId: null, paymentMethodIds: [] },
      ctx: ctxDefault(),
      promotions: [promo({ value: 50, maxValue: 30_000 })],
      manualSelections: [],
      customerHistory: [],
    });
    expect(result.resolvedLines[0].discount?.discountAmount).toBe(30_000);
  });
});

describe('discount-engine — mínimos', () => {
  it('minSubtotal bloquea cuando no se alcanza', () => {
    const result = applyPromotionsAutoSelected({
      cart: { lines: [lineRing({ unitPrice: 10_000 })], customerId: null, paymentMethodIds: [] },
      ctx: ctxDefault(),
      promotions: [promo({ minSubtotal: 50_000 })],
      manualSelections: [],
      customerHistory: [],
    });
    expect(result.appliedPromotions).toHaveLength(0);
  });

  it('minQuantity bloquea cuando no se alcanza', () => {
    const result = applyPromotionsAutoSelected({
      cart: { lines: [lineRing({ quantity: 1 })], customerId: null, paymentMethodIds: [] },
      ctx: ctxDefault(),
      promotions: [promo({ minQuantity: 5 })],
      manualSelections: [],
      customerHistory: [],
    });
    expect(result.appliedPromotions).toHaveLength(0);
  });
});

describe('discount-engine — ventana horaria y días de la semana', () => {
  it('daysOfWeek que no incluye hoy bloquea', () => {
    const result = applyPromotionsAutoSelected({
      cart: { lines: [lineRing()], customerId: null, paymentMethodIds: [] },
      ctx: ctxDefault(), // miércoles = 3
      promotions: [promo({ daysOfWeek: [0, 6] })],
      manualSelections: [],
      customerHistory: [],
    });
    expect(result.appliedPromotions).toHaveLength(0);
  });

  it('hourFrom/hourTo respeta la ventana (14:00 fuera de 09:00-12:00)', () => {
    const result = applyPromotionsAutoSelected({
      cart: { lines: [lineRing()], customerId: null, paymentMethodIds: [] },
      ctx: ctxDefault(),
      promotions: [promo({ hourFrom: '09:00', hourTo: '12:00' })],
      manualSelections: [],
      customerHistory: [],
    });
    expect(result.appliedPromotions).toHaveLength(0);
  });
});

describe('discount-engine — scopes INCLUDE/EXCLUDE', () => {
  it('INCLUDE de productos restringe a esos productos', () => {
    const result = applyPromotionsAutoSelected({
      cart: {
        lines: [lineRing(), lineNecklace()],
        customerId: null,
        paymentMethodIds: [],
      },
      ctx: ctxDefault(),
      promotions: [
        promo({
          value: 10,
          scopes: {
            branches: [],
            pointsOfSale: [],
            products: [{ productId: FIXTURE_PRODUCT_ID, mode: PromotionScopeMode.INCLUDE }],
            variants: [],
            categories: [],
            customers: [],
            paymentMethods: [],
          },
        }),
      ],
      manualSelections: [],
      customerHistory: [],
    });
    expect(result.resolvedLines[0].discount).not.toBeNull();
    expect(result.resolvedLines[1].discount).toBeNull();
  });

  it('EXCLUDE de productos excluye esos productos', () => {
    const result = applyPromotionsAutoSelected({
      cart: {
        lines: [lineRing(), lineNecklace()],
        customerId: null,
        paymentMethodIds: [],
      },
      ctx: ctxDefault(),
      promotions: [
        promo({
          value: 10,
          scopes: {
            branches: [],
            pointsOfSale: [],
            products: [
              { productId: FIXTURE_OTHER_PRODUCT_ID, mode: PromotionScopeMode.EXCLUDE },
            ],
            variants: [],
            categories: [],
            customers: [],
            paymentMethods: [],
          },
        }),
      ],
      manualSelections: [],
      customerHistory: [],
    });
    expect(result.resolvedLines[0].discount).not.toBeNull();
    expect(result.resolvedLines[1].discount).toBeNull();
  });

  it('INCLUDE de categoría', () => {
    const result = applyPromotionsAutoSelected({
      cart: {
        lines: [lineRing(), lineNecklace()],
        customerId: null,
        paymentMethodIds: [],
      },
      ctx: ctxDefault(),
      promotions: [
        promo({
          value: 10,
          scopes: {
            branches: [],
            pointsOfSale: [],
            products: [],
            variants: [],
            categories: [
              { categoryId: FIXTURE_CATEGORY_ID, mode: PromotionScopeMode.INCLUDE },
            ],
            customers: [],
            paymentMethods: [],
          },
        }),
      ],
      manualSelections: [],
      customerHistory: [],
    });
    expect(result.resolvedLines[0].discount).not.toBeNull();
    expect(result.resolvedLines[1].discount).toBeNull();
  });

  it('INCLUDE de cliente bloquea si no hay cliente seleccionado', () => {
    const result = applyPromotionsAutoSelected({
      cart: { lines: [lineRing()], customerId: null, paymentMethodIds: [] },
      ctx: ctxDefault(),
      promotions: [
        promo({
          value: 10,
          scopes: {
            branches: [],
            pointsOfSale: [],
            products: [],
            variants: [],
            categories: [],
            customers: [
              { customerId: FIXTURE_CUSTOMER_ID, mode: PromotionScopeMode.INCLUDE },
            ],
            paymentMethods: [],
          },
        }),
      ],
      manualSelections: [],
      customerHistory: [],
    });
    expect(result.appliedPromotions).toHaveLength(0);
  });

  it('INCLUDE de cliente aplica con cliente correcto', () => {
    const result = applyPromotionsAutoSelected({
      cart: { lines: [lineRing()], customerId: FIXTURE_CUSTOMER_ID, paymentMethodIds: [] },
      ctx: ctxDefault(),
      promotions: [
        promo({
          value: 10,
          scopes: {
            branches: [],
            pointsOfSale: [],
            products: [],
            variants: [],
            categories: [],
            customers: [
              { customerId: FIXTURE_CUSTOMER_ID, mode: PromotionScopeMode.INCLUDE },
            ],
            paymentMethods: [],
          },
        }),
      ],
      manualSelections: [],
      customerHistory: [],
    });
    expect(result.appliedPromotions).toHaveLength(1);
  });

  it('INCLUDE de método de pago bloquea si no se eligió ese método', () => {
    const result = applyPromotionsAutoSelected({
      cart: { lines: [lineRing()], customerId: null, paymentMethodIds: [FIXTURE_PAYMENT_METHOD_CASH] },
      ctx: ctxDefault(),
      promotions: [
        promo({
          value: 10,
          scopes: {
            branches: [],
            pointsOfSale: [],
            products: [],
            variants: [],
            categories: [],
            customers: [],
            paymentMethods: [
              { companyPaymentMethodId: FIXTURE_PAYMENT_METHOD_CARD, mode: PromotionScopeMode.INCLUDE },
            ],
          },
        }),
      ],
      manualSelections: [],
      customerHistory: [],
    });
    expect(result.appliedPromotions).toHaveLength(0);
  });

  it('INCLUDE de método de pago aplica si coincide', () => {
    const result = applyPromotionsAutoSelected({
      cart: { lines: [lineRing()], customerId: null, paymentMethodIds: [FIXTURE_PAYMENT_METHOD_CARD] },
      ctx: ctxDefault(),
      promotions: [
        promo({
          value: 10,
          scopes: {
            branches: [],
            pointsOfSale: [],
            products: [],
            variants: [],
            categories: [],
            customers: [],
            paymentMethods: [
              { companyPaymentMethodId: FIXTURE_PAYMENT_METHOD_CARD, mode: PromotionScopeMode.INCLUDE },
            ],
          },
        }),
      ],
      manualSelections: [],
      customerHistory: [],
    });
    expect(result.appliedPromotions).toHaveLength(1);
  });

  it('Branch fuera del INCLUDE bloquea', () => {
    const result = applyPromotionsAutoSelected({
      cart: { lines: [lineRing()], customerId: null, paymentMethodIds: [] },
      ctx: ctxDefault(),
      promotions: [
        promo({
          value: 10,
          scopes: {
            branches: [
              { branchId: 'other-branch', mode: PromotionScopeMode.INCLUDE },
            ],
            pointsOfSale: [],
            products: [],
            variants: [],
            categories: [],
            customers: [],
            paymentMethods: [],
          },
        }),
      ],
      manualSelections: [],
      customerHistory: [],
    });
    expect(result.appliedPromotions).toHaveLength(0);
  });

  it('POS dentro del INCLUDE aplica', () => {
    const result = applyPromotionsAutoSelected({
      cart: { lines: [lineRing()], customerId: null, paymentMethodIds: [] },
      ctx: ctxDefault(),
      promotions: [
        promo({
          value: 10,
          scopes: {
            branches: [],
            pointsOfSale: [
              { pointOfSaleId: FIXTURE_POS_ID, mode: PromotionScopeMode.INCLUDE },
            ],
            products: [],
            variants: [],
            categories: [],
            customers: [],
            paymentMethods: [],
          },
        }),
      ],
      manualSelections: [],
      customerHistory: [],
    });
    expect(result.appliedPromotions).toHaveLength(1);
  });
});

describe('discount-engine — límites de uso', () => {
  it('maxUsesTotal alcanzado bloquea y emite warning', () => {
    const result = applyPromotionsAutoSelected({
      cart: { lines: [lineRing()], customerId: null, paymentMethodIds: [] },
      ctx: ctxDefault(),
      promotions: [promo({ maxUsesTotal: 10, usesCount: 10 })],
      manualSelections: [],
      customerHistory: [],
    });
    expect(result.appliedPromotions).toHaveLength(0);
    expect(result.warnings.some((w) => w.code === 'GLOBAL_LIMIT_REACHED')).toBe(true);
  });

  it('maxUsesPerCustomer alcanzado bloquea y emite warning', () => {
    const result = applyPromotionsAutoSelected({
      cart: { lines: [lineRing()], customerId: FIXTURE_CUSTOMER_ID, paymentMethodIds: [] },
      ctx: ctxDefault(),
      promotions: [promo({ id: 'P', maxUsesPerCustomer: 1 })],
      manualSelections: [],
      customerHistory: [{ promotionId: 'P', usesByThisCustomer: 1 }],
    });
    expect(result.appliedPromotions).toHaveLength(0);
    expect(result.warnings.some((w) => w.code === 'CUSTOMER_LIMIT_REACHED')).toBe(true);
  });
});

describe('discount-engine — activations', () => {
  it('AUTO no aplica sin opt-in del cajero', () => {
    const result = applyPromotions({
      cart: { lines: [lineRing()], customerId: null, paymentMethodIds: [] },
      ctx: ctxDefault(),
      promotions: [promo({ activation: PromotionActivation.AUTO })],
      manualSelections: [],
      customerHistory: [],
    });
    expect(result.appliedPromotions).toHaveLength(0);
  });

  it('AUTO aplica si el cajero la selecciona', () => {
    const result = applyPromotions({
      cart: { lines: [lineRing()], customerId: null, paymentMethodIds: [] },
      ctx: ctxDefault(),
      promotions: [promo({ id: 'A', activation: PromotionActivation.AUTO })],
      manualSelections: [{ promotionId: 'A' }],
      customerHistory: [],
    });
    expect(result.appliedPromotions).toHaveLength(1);
  });

  it('MANUAL no aplica si no se selecciona', () => {
    const result = applyPromotions({
      cart: { lines: [lineRing()], customerId: null, paymentMethodIds: [] },
      ctx: ctxDefault(),
      promotions: [promo({ activation: PromotionActivation.MANUAL })],
      manualSelections: [],
      customerHistory: [],
    });
    expect(result.appliedPromotions).toHaveLength(0);
  });

  it('MANUAL aplica si se selecciona', () => {
    const result = applyPromotions({
      cart: { lines: [lineRing()], customerId: null, paymentMethodIds: [] },
      ctx: ctxDefault(),
      promotions: [promo({ id: 'M', activation: PromotionActivation.MANUAL })],
      manualSelections: [{ promotionId: 'M' }],
      customerHistory: [],
    });
    expect(result.appliedPromotions).toHaveLength(1);
  });

  it('CODE_ENTRY sólo aplica con selección manual (simula código ingresado)', () => {
    const args = {
      cart: { lines: [lineRing()], customerId: null, paymentMethodIds: [] },
      ctx: ctxDefault(),
      promotions: [
        promo({
          id: 'C',
          activation: PromotionActivation.CODE_ENTRY,
          redemptionCode: 'XMAS',
        }),
      ],
      manualSelections: [{ promotionId: 'C' }],
      customerHistory: [],
    };
    const result = applyPromotions(args);
    expect(result.appliedPromotions).toHaveLength(1);
  });

  it('selección manual con lineIds limita a esas líneas', () => {
    const result = applyPromotionsAutoSelected({
      cart: {
        lines: [lineRing(), lineNecklace()],
        customerId: null,
        paymentMethodIds: [],
      },
      ctx: ctxDefault(),
      promotions: [promo({ id: 'M', activation: PromotionActivation.MANUAL })],
      manualSelections: [{ promotionId: 'M', lineIds: ['L-NECK'] }],
      customerHistory: [],
    });
    expect(result.resolvedLines[0].discount).toBeNull();
    expect(result.resolvedLines[1].discount).not.toBeNull();
  });

  it('AUTO con lineIds también limita a esas líneas', () => {
    const result = applyPromotions({
      cart: {
        lines: [lineRing(), lineNecklace()],
        customerId: null,
        paymentMethodIds: [],
      },
      ctx: ctxDefault(),
      promotions: [promo({ id: 'A', activation: PromotionActivation.AUTO })],
      manualSelections: [{ promotionId: 'A', lineIds: ['L-NECK'] }],
      customerHistory: [],
    });
    expect(result.resolvedLines[0].discount).toBeNull();
    expect(result.resolvedLines[1].discount).not.toBeNull();
  });
});

describe('discount-engine — frozen y otros', () => {
  it('frozenDiscount se respeta y no se re-aplica', () => {
    const result = applyPromotionsAutoSelected({
      cart: {
        lines: [
          lineRing({
            frozenDiscount: {
              promotionId: 'OLD',
              promotionCode: 'OLD',
              promotionName: 'OLD',
              discountPercentage: 5,
              discountAmount: 5_000,
              appliedQuantity: 1,
            },
          }),
        ],
        customerId: null,
        paymentMethodIds: [],
      },
      ctx: ctxDefault(),
      promotions: [promo({ value: 50 })],
      manualSelections: [],
      customerHistory: [],
    });
    expect(result.resolvedLines[0].discount?.promotionId).toBe('OLD');
    expect(result.resolvedLines[0].discount?.discountAmount).toBe(5_000);
  });

  it('subtotal negativo es prevenido — orderDiscount no excede subtotal neto', () => {
    const result = applyPromotionsAutoSelected({
      cart: { lines: [lineRing({ unitPrice: 10_000 })], customerId: null, paymentMethodIds: [] },
      ctx: ctxDefault(),
      promotions: [promo({ type: PromotionType.AMOUNT_ON_ORDER, value: 999_999 })],
      manualSelections: [],
      customerHistory: [],
    });
    expect(result.orderDiscountAmount).toBe(10_000);
  });

  it('contexto sin scopes aplica universalmente', () => {
    const result = applyPromotionsAutoSelected({
      cart: { lines: [lineRing()], customerId: null, paymentMethodIds: [] },
      ctx: ctxDefault(),
      promotions: [promo()],
      manualSelections: [],
      customerHistory: [],
    });
    expect(result.appliedPromotions).toHaveLength(1);
  });
});
