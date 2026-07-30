import { EShopCartService } from '../../application/eshop-cart.service';

describe('EShopCartService.getOrCreateCart — converted token', () => {
  const cartRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };
  const cartItemRepo = {};
  const pricingStock = {
    resolveOperationalContext: jest.fn(),
    loadStockMap: jest.fn(),
    loadActiveVariants: jest.fn(),
  };
  const publisher = { publishCartUpdated: jest.fn() };

  const service = new EShopCartService(
    cartRepo as never,
    cartItemRepo as never,
    pricingStock as never,
    publisher as never,
  );

  const store = { companyId: 'co-1' } as never;

  beforeEach(() => {
    jest.clearAllMocks();
    pricingStock.resolveOperationalContext.mockResolvedValue({ storageId: null });
    pricingStock.loadStockMap.mockResolvedValue(new Map());
    pricingStock.loadActiveVariants.mockResolvedValue(new Map());
  });

  it('creates a new cart when cookie token points to a converted cart', async () => {
    cartRepo.findOne.mockResolvedValueOnce({
      id: 'old-cart',
      companyId: 'co-1',
      cartToken: 'token-old',
      status: 'converted',
      expiresAt: new Date(Date.now() + 86_400_000),
      version: 2,
      items: [],
      lockedAt: null,
      lockedReason: null,
      customerId: null,
      checkoutAttemptId: null,
    });

    const created = {
      id: 'new-cart',
      companyId: 'co-1',
      cartToken: 'token-new',
      status: 'active',
      expiresAt: new Date(Date.now() + 86_400_000),
      version: 1,
      items: [],
      lockedAt: null,
      lockedReason: null,
      customerId: null,
      checkoutAttemptId: null,
    };
    cartRepo.create.mockReturnValue(created);
    cartRepo.save.mockResolvedValue(created);

    const result = await service.getOrCreateCart(store, {
      cartToken: 'token-old',
    });

    expect(result.created).toBe(true);
    expect(result.cartToken).toBe('token-new');
    expect(cartRepo.create).toHaveBeenCalled();
  });
});
