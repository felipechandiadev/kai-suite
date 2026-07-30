import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from '../presentation/products.controller';
import { ProductsService } from '../application/products.service';
import { ProductsPosService } from '../application/products-pos.service';

describe('ProductsController', () => {
  let controller: ProductsController;
  let productsService: ProductsService;
  let productsPosService: ProductsPosService;

  const mockProductsService = {
    search: jest.fn(),
    getStocks: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockProductsPosService = {
    searchForPos: jest.fn(),
    getVariantStockForPos: jest.fn(),
    getVariantStockBreakdownForPos: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: mockProductsService,
        },
        {
          provide: ProductsPosService,
          useValue: mockProductsPosService,
        },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
    productsService = module.get<ProductsService>(ProductsService);
    productsPosService = module.get<ProductsPosService>(ProductsPosService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should search products with default pagination', async () => {
      const mockResults = {
        data: [
          { id: 'prod-1', name: 'Product A' },
          { id: 'prod-2', name: 'Product B' },
        ],
        pagination: { page: 1, pageSize: 10 },
      };

      mockProductsService.search.mockResolvedValue(mockResults);

      const result = await controller.findAll({});

      expect(result).toEqual(mockResults);
      expect(mockProductsService.search).toHaveBeenCalledWith({
        query: '',
        page: 1,
        pageSize: 10,
        priceListId: undefined,
      });
    });

    it('should search products with custom query and pagination', async () => {
      const mockResults = {
        data: [{ id: 'prod-1', name: 'Widget' }],
        pagination: { page: 2, pageSize: 25 },
      };

      mockProductsService.search.mockResolvedValue(mockResults);

      const result = await controller.findAll({
        query: 'widget',
        page: 2,
        pageSize: 25,
        priceListId: 'price-1',
      });

      expect(mockProductsService.search).toHaveBeenCalledWith({
        query: 'widget',
        page: 2,
        pageSize: 25,
        priceListId: 'price-1',
      });
    });
  });

  describe('search', () => {
    it('should call search on service with search dto', async () => {
      const searchDto = {
        query: 'laptop',
        page: 1,
        pageSize: 20,
      };

      const mockResults = {
        data: [{ id: 'prod-1', name: 'Laptop' }],
      };

      mockProductsService.search.mockResolvedValue(mockResults);

      const result = await controller.search(searchDto);

      expect(result).toEqual(mockResults);
      expect(mockProductsService.search).toHaveBeenCalledWith(searchDto);
    });
  });

  describe('searchForPos', () => {
    it('should search products for POS with price list and response wrapper', async () => {
      const searchDto = {
        query: 'coke',
        priceListId: 'price-1',
        branchId: 'branch-1',
      };

      const mockPosData = {
        products: [{ id: 'prod-1', name: 'Coke', price: 2.5 }],
        total: 1,
      };

      mockProductsPosService.searchForPos.mockResolvedValue(mockPosData);

      const result = await controller.searchForPos(searchDto);

      expect(result).toEqual({
        success: true,
        ...mockPosData,
      });
      expect(mockProductsPosService.searchForPos).toHaveBeenCalledWith(
        searchDto,
      );
    });
  });

  describe('stocks', () => {
    it('should retrieve stocks for a product', async () => {
      const mockStocks = [
        { storageId: 'stor-1', quantity: 100 },
        { storageId: 'stor-2', quantity: 50 },
      ];

      mockProductsService.getStocks.mockResolvedValue(mockStocks);

      const result = await controller.stocks('prod-1');

      expect(result).toEqual(mockStocks);
      expect(mockProductsService.getStocks).toHaveBeenCalledWith('prod-1');
    });
  });

  describe('create', () => {
    it('should create a new product', async () => {
      const createBody = {
        name: 'New Product',
        sku: 'SKU001',
        categoryId: 'cat-1',
      };

      const createdProduct = {
        id: 'prod-1',
        ...createBody,
      };

      mockProductsService.create.mockResolvedValue(createdProduct);

      const result = await controller.create(createBody);

      expect(result).toEqual(createdProduct);
      expect(mockProductsService.create).toHaveBeenCalledWith(createBody);
    });
  });

  describe('update', () => {
    it('should update a product', async () => {
      const updateBody = {
        name: 'Updated Product',
        sku: 'SKU002',
      };

      const updatedProduct = {
        id: 'prod-1',
        ...updateBody,
      };

      mockProductsService.update.mockResolvedValue(updatedProduct);

      const result = await controller.update('prod-1', updateBody);

      expect(result).toEqual(updatedProduct);
      expect(mockProductsService.update).toHaveBeenCalledWith(
        'prod-1',
        updateBody,
      );
    });
  });

  describe('remove', () => {
    it('should remove a product', async () => {
      const mockResponse = { success: true };

      mockProductsService.remove.mockResolvedValue(mockResponse);

      const result = await controller.remove('prod-1');

      expect(result).toEqual(mockResponse);
      expect(mockProductsService.remove).toHaveBeenCalledWith('prod-1');
    });
  });
});
