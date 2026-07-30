import {
  buildEShopProductCategoryNavHref,
  isEShopProductCategoryNavHref,
  parseEShopProductCategoryIdFromNavHref,
  sanitizeEShopNavLink,
} from '../../domain/company-eshop-nav.types';

const SAMPLE_UUID = 'ee40fac8-1416-4a1f-8f07-a76f126965ca';

describe('company-eshop-nav category href helpers', () => {
  it('builds product category nav href', () => {
    expect(buildEShopProductCategoryNavHref(SAMPLE_UUID)).toBe(
      `/productos?categoryId=${SAMPLE_UUID}`,
    );
  });

  it('parses categoryId from nav href', () => {
    expect(
      parseEShopProductCategoryIdFromNavHref(
        `/productos?categoryId=${SAMPLE_UUID}`,
      ),
    ).toBe(SAMPLE_UUID);
  });

  it('returns null for plain /productos', () => {
    expect(parseEShopProductCategoryIdFromNavHref('/productos')).toBeNull();
  });

  it('detects category nav href', () => {
    expect(
      isEShopProductCategoryNavHref(`/productos?categoryId=${SAMPLE_UUID}`),
    ).toBe(true);
    expect(isEShopProductCategoryNavHref('/productos')).toBe(false);
    expect(isEShopProductCategoryNavHref('/nosotros')).toBe(false);
  });

  it('sanitize accepts href with categoryId query', () => {
    const link = sanitizeEShopNavLink(
      {
        label: 'Anillos',
        kind: 'route',
        href: buildEShopProductCategoryNavHref(SAMPLE_UUID),
        enabled: true,
        order: 0,
      },
      0,
    );
    expect(link).not.toBeNull();
    expect(link?.href).toBe(`/productos?categoryId=${SAMPLE_UUID}`);
  });
});
