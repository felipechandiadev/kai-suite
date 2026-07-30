/**
 * INTEGRATION TESTS - Receptions Controller
 *
 * Tests para validar el endpoint de creación de recepciones
 * POST /api/receptions
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ReceptionsController } from '@modules/receptions/presentation/receptions.controller';
import { ReceptionsService } from '@modules/receptions/application/receptions.service';
import { Storage } from '@modules/storages/domain/storage.entity';
import { Branch } from '@modules/branches/domain/branch.entity';
import { Company } from '@modules/companies/domain/company.entity';
import { ProductVariantsService } from '@modules/product-variants/application/product-variants.service';
import { TransactionsService } from '@modules/transactions/application/transactions.service';

describe('ReceptionsController - Integration Tests', () => {
  let controller: ReceptionsController;
  let service: ReceptionsService;
  let storageRepository: Repository<Storage>;
  let branchRepository: Repository<Branch>;
  let companyRepository: Repository<Company>;
  let transactionsService: TransactionsService;
  let variantsService: ProductVariantsService;

  // Mock data
  const mockBranch = {
    id: 'branch-1',
    name: 'Sucursal Principal',
    companyId: 'company-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCompany = {
    id: 'company-1',
    razonSocial: 'Empresa Test',
    rut: '11.111.111-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockStorage = {
    id: 'storage-1',
    name: 'Bodega Principal',
    branchId: 'branch-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTransaction = {
    id: 'txn-1',
    documentNumber: 'TXN-001',
    total: 100000,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProductVariant = {
    id: 'variant-1',
    sku: 'SKU-001',
    variantName: 'Variante Test',
    product: {
      id: 'product-1',
      name: 'Producto Test',
    },
  };

  // Mock repositories
  const mockStorageRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
  };

  const mockBranchRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  const mockCompanyRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
  };

  // Mock services
  const mockTransactionsService = {
    createTransaction: jest.fn(),
  };

  const mockVariantsService = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReceptionsController],
      providers: [
        ReceptionsService,
        {
          provide: getRepositoryToken(Storage),
          useValue: mockStorageRepository,
        },
        {
          provide: getRepositoryToken(Branch),
          useValue: mockBranchRepository,
        },
        {
          provide: getRepositoryToken(Company),
          useValue: mockCompanyRepository,
        },
        {
          provide: TransactionsService,
          useValue: mockTransactionsService,
        },
        {
          provide: ProductVariantsService,
          useValue: mockVariantsService,
        },
      ],
    }).compile();

    controller = module.get<ReceptionsController>(ReceptionsController);
    service = module.get<ReceptionsService>(ReceptionsService);
    storageRepository = module.get<Repository<Storage>>(
      getRepositoryToken(Storage),
    );
    branchRepository = module.get<Repository<Branch>>(
      getRepositoryToken(Branch),
    );
    companyRepository = module.get<Repository<Company>>(
      getRepositoryToken(Company),
    );
    transactionsService = module.get<TransactionsService>(TransactionsService);
    variantsService = module.get<ProductVariantsService>(
      ProductVariantsService,
    );

    // Reset mocks
    jest.clearAllMocks();

    // Setup default mock implementations
    mockStorageRepository.findOne.mockResolvedValue(mockStorage);
    mockBranchRepository.findOne.mockResolvedValue(mockBranch);
    mockCompanyRepository.findOne.mockResolvedValue(mockCompany);
    mockTransactionsService.createTransaction.mockResolvedValue(
      mockTransaction,
    );
    mockVariantsService.findOne.mockResolvedValue(mockProductVariant);
  });

  describe('POST /api/receptions', () => {
    it('debe crear una recepción simple sin líneas', async () => {
      // Arrange
      const createData = {
        storageId: 'storage-1',
        branchId: 'branch-1',
        userId: 'user-1',
        supplierId: 'supplier-1',
        notes: 'Recepción de prueba',
        lines: [],
      };

      // Act
      const result = await controller.create(createData);

      // Assert
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.reception).toBeDefined();
      expect(result.reception!.id).toMatch(/^recv-/);
      expect(result.reception!.storageId).toBe('storage-1');
      expect(result.reception!.branchId).toBe('branch-1');
      expect(result.reception!.userId).toBe('user-1');
      expect(result.reception!.supplierId).toBe('supplier-1');
      expect(result.reception!.notes).toBe('Recepción de prueba');
      expect(result.reception!.lineCount).toBe(0);
      expect(result.reception!.total).toBe(0);
    });

    it('debe crear una recepción con líneas de productos', async () => {
      // Arrange
      const createData = {
        storageId: 'storage-1',
        branchId: 'branch-1',
        userId: 'user-1',
        supplierId: 'supplier-1',
        notes: 'Recepción con productos',
        lines: [
          {
            productVariantId: 'variant-1',
            quantity: 10,
            unitPrice: 5000,
            receivedQuantity: 10,
          },
          {
            productVariantId: 'variant-2',
            quantity: 5,
            unitPrice: 8000,
            receivedQuantity: 5,
          },
        ],
      };

      // Act
      const result = await controller.create(createData);

      // Assert
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.reception).toBeDefined();
      expect(result.reception!.id).toMatch(/^recv-/);
      expect(result.reception!.lineCount).toBe(2);
      expect(result.reception!.subtotal).toBe(90000); // (10 * 5000) + (5 * 8000)
      expect(result.reception!.total).toBe(90000);
      expect(result.reception!.lines).toHaveLength(2);
    });

    it('debe enriquecer las líneas con información de variante de producto', async () => {
      // Arrange
      const createData = {
        storageId: 'storage-1',
        branchId: 'branch-1',
        userId: 'user-1',
        lines: [
          {
            productVariantId: 'variant-1',
            quantity: 10,
            unitPrice: 5000,
            receivedQuantity: 10,
          },
        ],
      };

      // Act
      const result = await controller.create(createData);

      // Assert
      expect(result.reception!.lines![0].sku).toBe('SKU-001');
      expect(result.reception!.lines![0].productName).toBe('Producto Test');
      expect(mockVariantsService.findOne).toHaveBeenCalledWith('variant-1');
    });

    it('debe crear una transacción de compra asociada', async () => {
      // Arrange
      const createData = {
        storageId: 'storage-1',
        branchId: 'branch-1',
        userId: 'user-1',
        supplierId: 'supplier-1',
        lines: [
          {
            productName: 'Producto Test',
            quantity: 10,
            unitPrice: 5000,
            receivedQuantity: 10,
          },
        ],
      };

      // Act
      const result = await controller.create(createData);

      // Assert
      expect(result.transaction).toBeDefined();
      expect(result.transaction).not.toBeNull();
      expect(result.transaction!.id).toBe('txn-1');
      expect(result.reception!.transactionId).toBe('txn-1');
      expect(mockTransactionsService.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionType: 'PURCHASE',
          branchId: 'branch-1',
          supplierId: 'supplier-1',
          storageId: 'storage-1',
        }),
      );
    });

    it('debe manejar recepciones sin branchId usando el branch del storage', async () => {
      // Arrange
      const createData = {
        storageId: 'storage-1',
        userId: 'user-1',
        lines: [
          {
            productName: 'Producto Test',
            quantity: 5,
            unitPrice: 3000,
            receivedQuantity: 5,
          },
        ],
      };

      // Act
      const result = await controller.create(createData);

      // Assert
      expect(mockStorageRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'storage-1' },
      });
      expect(result.transaction).toBeDefined();
      expect(mockTransactionsService.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          branchId: 'branch-1', // Debe tomar el branchId del storage
        }),
      );
    });

    it('debe calcular correctamente los totales con múltiples líneas', async () => {
      // Arrange
      const createData = {
        storageId: 'storage-1',
        branchId: 'branch-1',
        userId: 'user-1',
        lines: [
          { quantity: 10, unitPrice: 1000, receivedQuantity: 10 },
          { quantity: 5, unitPrice: 2000, receivedQuantity: 5 },
          { quantity: 3, unitPrice: 5000, receivedQuantity: 3 },
        ],
      };

      // Act
      const result = await controller.create(createData);

      // Assert
      expect(result.reception!.lineCount).toBe(3);
      expect(result.reception!.subtotal).toBe(35000); // (10*1000) + (5*2000) + (3*5000)
      expect(result.reception!.total).toBe(35000);
    });

    it('debe manejar errores al crear la transacción sin fallar la recepción', async () => {
      // Arrange
      mockTransactionsService.createTransaction.mockRejectedValueOnce(
        new Error('Error creando transacción'),
      );

      const createData = {
        storageId: 'storage-1',
        branchId: 'branch-1',
        userId: 'user-1',
        lines: [
          {
            productName: 'Producto Test',
            quantity: 10,
            unitPrice: 5000,
            receivedQuantity: 10,
          },
        ],
      };

      // Act
      const result = await controller.create(createData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.reception).toBeDefined();
      expect(result.transactionError).toBeDefined();
    });

    it('debe incluir metadata en la transacción creada', async () => {
      // Arrange
      const createData = {
        storageId: 'storage-1',
        branchId: 'branch-1',
        userId: 'user-1',
        supplierId: 'supplier-1',
        reference: 'REF-123',
        lines: [
          {
            productName: 'Producto Test',
            quantity: 10,
            unitPrice: 5000,
            receivedQuantity: 10,
          },
        ],
      };

      // Act
      await controller.create(createData);

      // Assert
      expect(mockTransactionsService.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            origin: 'RECEPTION',
            receptionType: 'direct',
            storageId: 'storage-1',
            supplierId: 'supplier-1',
            reference: 'REF-123',
            document_type: null,
          }),
          externalReference: 'REF-123',
        }),
      );
    });

    it('incluye reference y document_type en metadata cuando se envían', async () => {
      const createData = {
        storageId: 'storage-1',
        branchId: 'branch-1',
        userId: 'user-1',
        supplierId: 'supplier-1',
        reference: 'T-123456',
        documentType: 'receipt' as const,
        lines: [
          {
            productName: 'Producto Test',
            quantity: 10,
            unitPrice: 5000,
            receivedQuantity: 10,
          },
        ],
      };

      await controller.create(createData);

      expect(mockTransactionsService.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            reference: 'T-123456',
            document_type: 'receipt',
          }),
          externalReference: 'T-123456',
        }),
      );
    });
  });

  describe('GET /api/receptions', () => {
    it('debe listar las recepciones creadas', async () => {
      // Arrange - Crear algunas recepciones primero
      await controller.create({
        storageId: 'storage-1',
        branchId: 'branch-1',
        userId: 'user-1',
        lines: [],
      });

      await controller.create({
        storageId: 'storage-1',
        branchId: 'branch-1',
        userId: 'user-1',
        lines: [],
      });

      // Act
      const result = await controller.findAll();

      // Assert
      expect(result).toBeDefined();
      expect(result.rows).toBeDefined();
      expect(result.rows.length).toBeGreaterThanOrEqual(2);
      expect(result.count).toBeGreaterThanOrEqual(2);
      expect(result.limit).toBe(25);
      expect(result.offset).toBe(0);
    });

    it('debe respetar los parámetros de paginación', async () => {
      // Act
      const result = await controller.findAll('10', '5');

      // Assert
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(5);
    });
  });

  describe('GET /api/receptions/:id', () => {
    it('debe obtener una recepción por ID', async () => {
      // Arrange
      const created = await controller.create({
        storageId: 'storage-1',
        branchId: 'branch-1',
        userId: 'user-1',
        notes: 'Test reception',
        lines: [],
      });

      // Act
      const result = await controller.findOne(created.reception!.id);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(created.reception!.id);
      expect(result.notes).toBe('Test reception');
    });

    it('debe lanzar NotFoundException si no existe la recepción', async () => {
      // Act & Assert
      await expect(controller.findOne('non-existent-id')).rejects.toThrow();
    });
  });
});
