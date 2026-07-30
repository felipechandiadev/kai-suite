import { Test, TestingModule } from '@nestjs/testing';
import { CategoryController } from '../presentation/category.controller';
import { CategoryService } from '../application/category.service';

describe('CategoryController', () => {
  let controller: CategoryController;
  let service: CategoryService;

  const mockCategoryService = {
    findAll: jest.fn(),
    getCategoriesWithCounts: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoryController],
      providers: [
        {
          provide: CategoryService,
          useValue: mockCategoryService,
        },
      ],
    }).compile();

    controller = module.get<CategoryController>(CategoryController);
    service = module.get<CategoryService>(CategoryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all categories', async () => {
      const mockCategories = [
        { id: 'cat-1', name: 'Electronics', code: 'ELEC' },
        { id: 'cat-2', name: 'Groceries', code: 'GROC' },
      ];

      mockCategoryService.findAll.mockResolvedValue(mockCategories);

      const result = await controller.findAll({});

      expect(result).toEqual(mockCategories);
      expect(mockCategoryService.findAll).toHaveBeenCalledWith({});
    });

    it('should pass query filters to service', async () => {
      const mockCategories = [];
      const query = { search: 'Electro' };

      mockCategoryService.findAll.mockResolvedValue(mockCategories);

      await controller.findAll(query);

      expect(mockCategoryService.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('getCategoriesWithCounts', () => {
    it('should return categories with product counts', async () => {
      const mockCategoriesWithCounts = [
        { id: 'cat-1', name: 'Electronics', productCount: 15 },
        { id: 'cat-2', name: 'Groceries', productCount: 32 },
      ];

      mockCategoryService.getCategoriesWithCounts.mockResolvedValue(
        mockCategoriesWithCounts,
      );

      const result = await controller.getCategoriesWithCounts();

      expect(result).toEqual(mockCategoriesWithCounts);
      expect(mockCategoryService.getCategoriesWithCounts).toHaveBeenCalledTimes(
        1,
      );
    });

    it('should return empty array if no categories', async () => {
      mockCategoryService.getCategoriesWithCounts.mockResolvedValue([]);

      const result = await controller.getCategoriesWithCounts();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a single category by id', async () => {
      const mockCategory = {
        id: 'cat-1',
        name: 'Electronics',
        code: 'ELEC',
      };

      mockCategoryService.findOne.mockResolvedValue(mockCategory);

      const result = await controller.findOne('cat-1');

      expect(result).toEqual(mockCategory);
      expect(mockCategoryService.findOne).toHaveBeenCalledWith('cat-1');
    });

    it('should handle category not found', async () => {
      mockCategoryService.findOne.mockResolvedValue(null);

      const result = await controller.findOne('nonexistent');

      expect(result).toBeNull();
      expect(mockCategoryService.findOne).toHaveBeenCalledWith('nonexistent');
    });
  });

  describe('create', () => {
    it('should create a new category', async () => {
      const createDto = {
        name: 'Office Supplies',
        code: 'OFFC',
        description: 'Office related products',
      };

      const createdCategory = {
        id: 'cat-3',
        ...createDto,
      };

      mockCategoryService.create.mockResolvedValue(createdCategory);

      const result = await controller.create(createDto);

      expect(result).toEqual(createdCategory);
      expect(mockCategoryService.create).toHaveBeenCalledWith(createDto);
    });

    it('should handle creating category with minimal data', async () => {
      const createDto = { name: 'New Category' };

      const createdCategory = { id: 'cat-4', ...createDto };

      mockCategoryService.create.mockResolvedValue(createdCategory);

      const result = await controller.create(createDto);

      expect(result).toEqual(createdCategory);
    });
  });

  describe('update', () => {
    it('should update a category', async () => {
      const updateDto = {
        name: 'Updated Electronics',
        code: 'ELEC-UPD',
      };

      const updatedCategory = {
        id: 'cat-1',
        ...updateDto,
      };

      mockCategoryService.update.mockResolvedValue(updatedCategory);

      const result = await controller.update('cat-1', updateDto);

      expect(result).toEqual(updatedCategory);
      expect(mockCategoryService.update).toHaveBeenCalledWith(
        'cat-1',
        updateDto,
      );
    });

    it('should handle partial updates', async () => {
      const updateDto = { name: 'Only Updated Name' };

      const updatedCategory = {
        id: 'cat-1',
        name: 'Only Updated Name',
        code: 'ELEC',
      };

      mockCategoryService.update.mockResolvedValue(updatedCategory);

      const result = await controller.update('cat-1', updateDto);

      expect(result).toEqual(updatedCategory);
    });
  });

  describe('remove', () => {
    it('should remove a category and return success message', async () => {
      mockCategoryService.remove.mockResolvedValue(undefined);

      const result = await controller.remove('cat-1');

      expect(result).toEqual({ success: true });
      expect(mockCategoryService.remove).toHaveBeenCalledWith('cat-1');
    });

    it('should handle removal errors', async () => {
      mockCategoryService.remove.mockRejectedValue(
        new Error('Category not found'),
      );

      await expect(controller.remove('nonexistent')).rejects.toThrow(
        'Category not found',
      );
    });
  });
});
