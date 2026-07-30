import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProductType } from '@modules/products/domain/product.entity';
import { ProductModeService } from './product-mode.service';

describe('ProductModeService', () => {
  const makeService = (kaiProduct: string) => {
    const configService = {
      get: jest.fn((key: string, defaultValue?: string) =>
        key === 'KAI_PRODUCT' ? kaiProduct : defaultValue,
      ),
    } as unknown as ConfigService;
    return new ProductModeService(configService);
  };

  it('defaults to kaistore when env is kaistore', () => {
    const service = makeService('kaistore');
    expect(service.getProductMode()).toBe('kaistore');
    expect(service.isKaiFood()).toBe(false);
  });

  it('detects kaifood mode', () => {
    const service = makeService('kaifood');
    expect(service.getProductMode()).toBe('kaifood');
    expect(service.isKaiFood()).toBe(true);
  });

  it('detects kaisuite as food-enabled', () => {
    const service = makeService('kaisuite');
    expect(service.getProductMode()).toBe('kaisuite');
    expect(service.isKaiFood()).toBe(true);
  });

  it('allows PREPARADO in kaifood', () => {
    const service = makeService('kaifood');
    expect(() =>
      service.assertProductTypeAllowed(ProductType.PREPARADO),
    ).not.toThrow();
  });

  it('allows PREPARADO in kaisuite', () => {
    const service = makeService('kaisuite');
    expect(() =>
      service.assertProductTypeAllowed(ProductType.PREPARADO),
    ).not.toThrow();
  });

  it('rejects PREPARADO outside kaifood/kaisuite', () => {
    const service = makeService('kaistore');
    expect(() =>
      service.assertProductTypeAllowed(ProductType.PREPARADO),
    ).toThrow(BadRequestException);
  });

  it('allows PHYSICAL in kaistore', () => {
    const service = makeService('kaistore');
    expect(() =>
      service.assertProductTypeAllowed(ProductType.PHYSICAL),
    ).not.toThrow();
  });
});
