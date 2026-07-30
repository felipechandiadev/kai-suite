import { Test, TestingModule } from '@nestjs/testing';
import { InventoryController } from '../presentation/inventory.controller';
import { InventoryService } from '../application/inventory.service';

describe('InventoryController', () => {
  let controller: InventoryController;
  let service: InventoryService;

  const mockInventoryService = {
    getFilters: jest.fn(),
    search: jest.fn(),
    adjust: jest.fn(),
    transfer: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryController],
      providers: [
        {
          provide: InventoryService,
          useValue: mockInventoryService,
        },
      ],
    }).compile();

    controller = module.get<InventoryController>(InventoryController);
    service = module.get<InventoryService>(InventoryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getFilters', () => {
    it('should return filters from service', async () => {
      const mockFilters = {
        categories: ['Cat1', 'Cat2'],
        storages: ['Storage1', 'Storage2'],
      };

      mockInventoryService.getFilters.mockResolvedValue(mockFilters);

      const result = await controller.getFilters();

      expect(result).toEqual(mockFilters);
      expect(mockInventoryService.getFilters).toHaveBeenCalledTimes(1);
    });
  });

  describe('getInventory', () => {
    it('should return inventory search results with query params', async () => {
      const mockParams = {
        search: 'widget',
        branchId: 'branch-1',
        storageId: 'storage-1',
      };

      const mockResults = [
        { id: 'variant-1', name: 'Widget A', quantity: 10 },
        { id: 'variant-2', name: 'Widget B', quantity: 20 },
      ];

      mockInventoryService.search.mockResolvedValue(mockResults);

      const result = await controller.getInventory(mockParams);

      expect(result).toEqual(mockResults);
      expect(mockInventoryService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'widget',
          branchId: 'branch-1',
          storageId: 'storage-1',
          page: 1,
          limit: 25,
          sortField: 'productName',
          sort: 'asc',
        }),
      );
    });

    it('should handle search without query params', async () => {
      const mockResults = [{ id: 'variant-1', name: 'Widget', quantity: 10 }];

      mockInventoryService.search.mockResolvedValue(mockResults);

      const result = await controller.getInventory({});

      expect(result).toEqual(mockResults);
      expect(mockInventoryService.search).toHaveBeenCalledWith({
        search: undefined,
        branchId: undefined,
        storageId: undefined,
        page: 1,
        limit: 25,
        sortField: 'productName',
        sort: 'asc',
      });
    });
  });

  describe('adjust', () => {
    it('should call adjust on service with correct data', async () => {
      const adjustData = {
        variantId: 'variant-1',
        storageId: 'storage-1',
        currentQuantity: 5,
        targetQuantity: 8,
        note: 'counting',
      };

      const mockResponse = { success: true, newQuantity: 15 };

      mockInventoryService.adjust.mockResolvedValue(mockResponse);

      const result = await controller.adjust(adjustData);

      expect(result).toEqual(mockResponse);
      expect(mockInventoryService.adjust).toHaveBeenCalledWith(adjustData);
    });
  });

  describe('transfer', () => {
    it('should call transfer on service with correct data', async () => {
      const transferData = {
        variantId: 'variant-1',
        sourceStorageId: 'storage-1',
        targetStorageId: 'storage-2',
        quantity: 10,
      };

      const mockResponse = { success: true };

      mockInventoryService.transfer.mockResolvedValue(mockResponse);

      const result = await controller.transfer(transferData);

      expect(result).toEqual(mockResponse);
      expect(mockInventoryService.transfer).toHaveBeenCalledWith(transferData);
    });
  });
});
