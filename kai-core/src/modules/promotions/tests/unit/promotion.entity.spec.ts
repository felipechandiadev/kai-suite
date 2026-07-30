import { Promotion } from '../../domain/promotion.entity';
import {
  PromotionActivation,
  PromotionAuthorization,
  PromotionType,
} from '../../domain/promotion.enums';

describe('Promotion entity', () => {
  it('se instancia con todos los campos requeridos sin lanzar', () => {
    const p = new Promotion();
    p.companyId = '00000000-0000-0000-0000-000000000000';
    p.code = 'BLACK-FRIDAY';
    p.name = 'Black Friday 2025';
    p.type = PromotionType.PERCENT_ON_ORDER;
    p.value = 15;
    p.activation = PromotionActivation.AUTO;
    p.authorization = PromotionAuthorization.NONE;

    expect(p.code).toBe('BLACK-FRIDAY');
    expect(p.type).toBe(PromotionType.PERCENT_ON_ORDER);
    expect(p.value).toBe(15);
  });

  it('soporta los 6 PromotionType definidos', () => {
    expect(Object.values(PromotionType)).toEqual([
      'PERCENT_ON_LINE',
      'AMOUNT_ON_LINE',
      'PERCENT_ON_ORDER',
      'AMOUNT_ON_ORDER',
      'PRICE_OVERRIDE',
      'BUY_X_GET_Y',
    ]);
  });

  it('soporta las 3 activaciones', () => {
    expect(Object.values(PromotionActivation)).toEqual([
      'AUTO',
      'MANUAL',
      'CODE_ENTRY',
    ]);
  });

  it('soporta los 3 niveles de autorización', () => {
    expect(Object.values(PromotionAuthorization)).toEqual([
      'NONE',
      'CASHIER',
      'MANAGER_PIN',
    ]);
  });
});
