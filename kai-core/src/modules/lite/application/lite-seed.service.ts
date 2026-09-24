import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Branch } from '@modules/branches/domain/branch.entity';
import { Company } from '@modules/companies/domain/company.entity';
import { Customer } from '@modules/customers/domain/customer.entity';
import { Person, PersonType } from '@modules/persons/domain/person.entity';
import { PointOfSale } from '@modules/points-of-sale/domain/point-of-sale.entity';
import { Product, ProductType } from '@modules/products/domain/product.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import {
  Storage,
  StorageCategory,
  StorageType,
} from '@modules/storages/domain/storage.entity';
import { StockLevel } from '@modules/stock-levels/domain/stock-level.entity';
import { Supplier } from '@modules/suppliers/domain/supplier.entity';
import { Tax, TaxType } from '@modules/taxes/domain/tax.entity';
import { Unit } from '@modules/units/domain/unit.entity';
import { UnitDimension } from '@modules/units/domain/unit-dimension.enum';
import { Category } from '@modules/categories/domain/category.entity';
import { Attribute } from '@modules/attributes/domain/attribute.entity';
import { User, UserRole } from '@modules/users/domain/user.entity';
import { UserCompanyMembership } from '@modules/users/domain/user-company-membership.entity';
import { UserCompanyRole } from '@modules/users/domain/user-company-role.entity';
import { PlatformRoleCode } from '@modules/users/domain/platform-role.codes';
import { AppConfigService } from '../../../config/config.service';

export type LiteSeedResult = {
  seeded: boolean;
  companyId?: string;
  adminUserId?: string;
  adminUserName: string;
  cashierUserName?: string;
  branchId?: string;
  storageId?: string;
  posId?: string;
  sampleVariantIds?: {
    physical?: string;
    service?: string;
    pack?: string;
  };
  message: string;
};

@Injectable()
export class LiteSeedService {
  private readonly logger = new Logger(LiteSeedService.name);

  constructor(
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    @InjectRepository(Person)
    private readonly personRepo: Repository<Person>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserCompanyMembership)
    private readonly membershipRepo: Repository<UserCompanyMembership>,
    @InjectRepository(UserCompanyRole)
    private readonly roleRepo: Repository<UserCompanyRole>,
    @InjectRepository(Unit)
    private readonly unitRepo: Repository<Unit>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(Attribute)
    private readonly attributeRepo: Repository<Attribute>,
    @InjectRepository(Tax)
    private readonly taxRepo: Repository<Tax>,
    @InjectRepository(Storage)
    private readonly storageRepo: Repository<Storage>,
    @InjectRepository(PointOfSale)
    private readonly posRepo: Repository<PointOfSale>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(ProductVariant)
    private readonly variantRepo: Repository<ProductVariant>,
    @InjectRepository(StockLevel)
    private readonly stockLevelRepo: Repository<StockLevel>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Supplier)
    private readonly supplierRepo: Repository<Supplier>,
    private readonly config: AppConfigService,
  ) {}

  /**
   * Unidades alineadas al seed suite demo: UN (conteo) + ml/L + g/kg.
   * Idempotente: se puede llamar con DB ya sembrada.
   */
  async ensureUnitsCatalog(companyId: string): Promise<{
    baseUnit: Unit;
    created: string[];
    synced: string[];
  }> {
    const created: string[] = [];
    const synced: string[] = [];

    const upsert = async (args: {
      symbol: string;
      name: string;
      dimension: UnitDimension;
      isBase: boolean;
      conversionFactor: number;
      baseUnitId: string | null;
      allowDecimals: boolean;
      isDefault?: boolean;
    }): Promise<Unit> => {
      let unit = await this.unitRepo.findOne({
        where: { companyId, symbol: args.symbol },
      });
      if (!unit) {
        unit = await this.unitRepo.save(
          this.unitRepo.create({
            companyId,
            symbol: args.symbol,
            name: args.name,
            dimension: args.dimension,
            isBase: args.isBase,
            conversionFactor: args.conversionFactor,
            baseUnitId: args.baseUnitId,
            allowDecimals: args.allowDecimals,
            isDefault: Boolean(args.isDefault),
            active: true,
          }),
        );
        created.push(args.symbol);
        return unit;
      }

      unit.name = args.name;
      unit.dimension = args.dimension;
      unit.isBase = args.isBase;
      unit.conversionFactor = args.conversionFactor;
      unit.baseUnitId = args.baseUnitId;
      unit.allowDecimals = args.allowDecimals;
      if (args.isDefault != null) unit.isDefault = args.isDefault;
      unit.active = true;
      await this.unitRepo.save(unit);
      synced.push(args.symbol);
      return unit;
    };

    const unitUn = await upsert({
      symbol: 'UN',
      name: 'Unidad',
      dimension: UnitDimension.COUNT,
      isBase: true,
      conversionFactor: 1,
      baseUnitId: null,
      allowDecimals: false,
      isDefault: true,
    });

    // Solo una default: limpiar otras si quedaron de seeds viejos
    const defaults = await this.unitRepo.find({
      where: { companyId, isDefault: true },
    });
    for (const row of defaults) {
      if (row.id === unitUn.id) continue;
      row.isDefault = false;
      await this.unitRepo.save(row);
    }

    const unitMl = await upsert({
      symbol: 'ml',
      name: 'Mililitro',
      dimension: UnitDimension.VOLUME,
      isBase: true,
      conversionFactor: 1,
      baseUnitId: null,
      allowDecimals: true,
    });
    await upsert({
      symbol: 'L',
      name: 'Litro',
      dimension: UnitDimension.VOLUME,
      isBase: false,
      conversionFactor: 1000,
      baseUnitId: unitMl.id,
      allowDecimals: true,
    });
    const unitGram = await upsert({
      symbol: 'g',
      name: 'Gramo',
      dimension: UnitDimension.MASS,
      isBase: true,
      conversionFactor: 1,
      baseUnitId: null,
      allowDecimals: true,
    });
    await upsert({
      symbol: 'kg',
      name: 'Kilogramo',
      dimension: UnitDimension.MASS,
      isBase: false,
      conversionFactor: 1000,
      baseUnitId: unitGram.id,
      allowDecimals: true,
    });

    return { baseUnit: unitUn, created, synced };
  }

  /**
   * Categorías y atributos de muestra (idempotente por nombre).
   */
  async ensureTaxonomyCatalog(companyId: string): Promise<{
    categoriesCreated: string[];
    attributesCreated: string[];
  }> {
    const categoriesCreated: string[] = [];
    const attributesCreated: string[] = [];

    const ensureCategory = async (name: string, description?: string) => {
      const existing = await this.categoryRepo.findOne({
        where: { companyId, name },
      });
      if (existing) return existing;
      const row = await this.categoryRepo.save(
        this.categoryRepo.create({
          companyId,
          name,
          description,
          sortOrder: 0,
          isActive: true,
        }),
      );
      categoriesCreated.push(name);
      return row;
    };

    await ensureCategory('General', 'Categoría por defecto');
    await ensureCategory('Bebidas', 'Bebidas y refrescos');
    await ensureCategory('Snacks', 'Snacks y golosinas');

    const ensureAttribute = async (
      name: string,
      options: string[],
      description?: string,
    ) => {
      const existing = await this.attributeRepo.findOne({
        where: { companyId, name },
      });
      if (existing) return existing;
      const row = await this.attributeRepo.save(
        this.attributeRepo.create({
          companyId,
          name,
          description,
          options,
          displayOrder: 0,
          isActive: true,
        }),
      );
      attributesCreated.push(name);
      return row;
    };

    await ensureAttribute('Talla', ['S', 'M', 'L', 'XL'], 'Tallas de ropa');
    await ensureAttribute(
      'Color',
      ['Rojo', 'Azul', 'Negro', 'Blanco'],
      'Colores disponibles',
    );

    return { categoriesCreated, attributesCreated };
  }

  /**
   * Catálogo demo POS (~30 productos). Idempotente por SKU: re-ejecutar seed
   * con admin existente completa los faltantes sin duplicar.
   */
  async ensureDemoProducts(companyId: string): Promise<{
    createdProducts: number;
    skippedSkus: number;
    sampleVariantIds: NonNullable<LiteSeedResult['sampleVariantIds']>;
  }> {
    const unit =
      (await this.unitRepo.findOne({
        where: { companyId, symbol: 'UN' },
      })) ??
      (await this.unitRepo.findOne({ where: { companyId }, order: { createdAt: 'ASC' } }));
    if (!unit) {
      throw new Error('Lite seed: falta unidad base (UN) antes de productos demo');
    }

    let tax = await this.taxRepo.findOne({
      where: { companyId, isDefault: true },
    });
    if (!tax) {
      tax = await this.taxRepo.findOne({ where: { companyId } });
    }
    if (!tax) {
      throw new Error('Lite seed: falta impuesto antes de productos demo');
    }

    const storage =
      (await this.storageRepo.findOne({
        where: { companyId, isDefault: true },
      })) ??
      (await this.storageRepo.findOne({
        where: { companyId },
        order: { createdAt: 'ASC' },
      }));
    if (!storage) {
      throw new Error('Lite seed: falta bodega antes de productos demo');
    }

    const tallaAttr = await this.attributeRepo.findOne({
      where: { companyId, name: 'Talla' },
    });

    type DemoSample = {
      name: string;
      type: ProductType;
      sku: string;
      basePrice: number;
      stock?: number;
      key?: 'physical' | 'service' | 'pack';
      barcode?: string;
      extraVariants?: Array<{
        sku: string;
        basePrice: number;
        stock?: number;
        attributeValues?: Record<string, string>;
        barcode?: string;
      }>;
      attributeValues?: Record<string, string>;
    };

    const retailExtras: Array<{
      name: string;
      sku: string;
      basePrice: number;
      stock: number;
      barcode: string;
    }> = [
      { name: 'Café molido 500g', sku: 'P-010', basePrice: 4590, stock: 40, barcode: '7801001000101' },
      { name: 'Azúcar 1kg', sku: 'P-011', basePrice: 1290, stock: 80, barcode: '7801001000118' },
      { name: 'Aceite vegetal 900ml', sku: 'P-012', basePrice: 2490, stock: 55, barcode: '7801001000125' },
      { name: 'Galletas surtidas', sku: 'P-013', basePrice: 990, stock: 100, barcode: '7801001000132' },
      { name: 'Bebida cola 1.5L', sku: 'P-014', basePrice: 1590, stock: 120, barcode: '7801001000149' },
      { name: 'Agua mineral 1.5L', sku: 'P-015', basePrice: 890, stock: 150, barcode: '7801001000156' },
      { name: 'Pan de molde', sku: 'P-016', basePrice: 1790, stock: 35, barcode: '7801001000163' },
      { name: 'Leche entera 1L', sku: 'P-017', basePrice: 1190, stock: 60, barcode: '7801001000170' },
      { name: 'Yogurt natural', sku: 'P-018', basePrice: 690, stock: 70, barcode: '7801001000187' },
      { name: 'Arroz grado 1 1kg', sku: 'P-019', basePrice: 1490, stock: 90, barcode: '7801001000194' },
      { name: 'Fideos spaghetti', sku: 'P-020', basePrice: 890, stock: 85, barcode: '7801001000200' },
      { name: 'Jabón líquido 500ml', sku: 'P-021', basePrice: 2290, stock: 45, barcode: '7801001000217' },
      { name: 'Shampoo 400ml', sku: 'P-022', basePrice: 3490, stock: 40, barcode: '7801001000224' },
      { name: 'Papel higiénico 4u', sku: 'P-023', basePrice: 2990, stock: 50, barcode: '7801001000231' },
      { name: 'Detergente 3L', sku: 'P-024', basePrice: 4990, stock: 30, barcode: '7801001000248' },
      { name: 'Cerveza lata 350ml', sku: 'P-025', basePrice: 890, stock: 200, barcode: '7801001000255' },
      { name: 'Vino tinto 750ml', sku: 'P-026', basePrice: 4990, stock: 25, barcode: '7801001000262' },
      { name: 'Chocolate barra', sku: 'P-027', basePrice: 1290, stock: 75, barcode: '7801001000279' },
      { name: 'Papas fritas 150g', sku: 'P-028', basePrice: 1590, stock: 65, barcode: '7801001000286' },
      { name: 'Jugo naranja 1L', sku: 'P-029', basePrice: 1890, stock: 40, barcode: '7801001000293' },
      { name: 'Mantequilla 250g', sku: 'P-030', basePrice: 2490, stock: 35, barcode: '7801001000309' },
      { name: 'Huevos docena', sku: 'P-031', basePrice: 2990, stock: 40, barcode: '7801001000316' },
      { name: 'Queso gauda 200g', sku: 'P-032', basePrice: 3290, stock: 30, barcode: '7801001000323' },
      { name: 'Tomate kg', sku: 'P-033', basePrice: 1590, stock: 50, barcode: '7801001000330' },
      { name: 'Cebolla kg', sku: 'P-034', basePrice: 990, stock: 50, barcode: '7801001000347' },
      { name: 'Plátano kg', sku: 'P-035', basePrice: 1290, stock: 45, barcode: '7801001000354' },
      { name: 'Manzana kg', sku: 'P-036', basePrice: 1490, stock: 45, barcode: '7801001000361' },
    ];

    const sampleProducts: DemoSample[] = [
      {
        name: 'Producto físico',
        type: ProductType.PHYSICAL,
        sku: 'P-001-S',
        basePrice: 1990,
        stock: 20,
        key: 'physical',
        barcode: '7801001000019',
        attributeValues:
          tallaAttr != null ? { [tallaAttr.id]: 'S' } : undefined,
        extraVariants: [
          {
            sku: 'P-001-M',
            basePrice: 1990,
            stock: 15,
            barcode: '7801001000026',
            attributeValues:
              tallaAttr != null ? { [tallaAttr.id]: 'M' } : undefined,
          },
        ],
      },
      {
        name: 'Servicio',
        type: ProductType.SERVICE,
        sku: 'S-001',
        basePrice: 5000,
        key: 'service',
      },
      {
        name: 'Pack',
        type: ProductType.PACK,
        sku: 'K-001',
        basePrice: 9990,
        key: 'pack',
      },
      ...retailExtras.map((r) => ({
        name: r.name,
        type: ProductType.PHYSICAL,
        sku: r.sku,
        basePrice: r.basePrice,
        stock: r.stock,
        barcode: r.barcode,
      })),
    ];

    const sampleVariantIds: NonNullable<LiteSeedResult['sampleVariantIds']> =
      {};
    let createdProducts = 0;
    let skippedSkus = 0;

    for (const sample of sampleProducts) {
      const existingPrimary = await this.variantRepo.findOne({
        where: { companyId, sku: sample.sku },
      });
      if (existingPrimary) {
        skippedSkus += 1;
        if (sample.key) {
          sampleVariantIds[sample.key] = existingPrimary.id;
        }
        for (const ev of sample.extraVariants ?? []) {
          const existingExtra = await this.variantRepo.findOne({
            where: { companyId, sku: ev.sku },
          });
          if (existingExtra) skippedSkus += 1;
        }
        continue;
      }

      const product = await this.productRepo.save(
        this.productRepo.create({
          companyId,
          name: sample.name,
          productType: sample.type,
          taxIds: [tax.id],
          baseUnitId: unit.id,
          isActive: true,
          visibleInEShop: false,
          onMenu: false,
        }),
      );
      createdProducts += 1;

      const trackInventory = sample.type === ProductType.PHYSICAL;
      const variantDefs: Array<{
        sku: string;
        basePrice: number;
        stock?: number;
        attributeValues?: Record<string, string>;
        barcode?: string;
        isPrimary?: boolean;
      }> = [
        {
          sku: sample.sku,
          basePrice: sample.basePrice,
          stock: sample.stock,
          attributeValues: sample.attributeValues,
          barcode: sample.barcode,
          isPrimary: true,
        },
        ...(sample.extraVariants ?? []).map((ev) => ({
          ...ev,
          isPrimary: false as const,
        })),
      ];

      for (const def of variantDefs) {
        const existingSku = await this.variantRepo.findOne({
          where: { companyId, sku: def.sku },
        });
        if (existingSku) {
          skippedSkus += 1;
          if (def.isPrimary && sample.key) {
            sampleVariantIds[sample.key] = existingSku.id;
          }
          continue;
        }

        const variant = await this.variantRepo.save(
          this.variantRepo.create({
            companyId,
            productId: product.id,
            sku: def.sku,
            barcode: def.barcode,
            basePrice: def.basePrice,
            baseCost: 0,
            unitId: unit.id,
            stockBaseUnitId: unit.id,
            saleUnitId: unit.id,
            purchaseUnitId: unit.id,
            taxIds: [tax.id],
            trackInventory,
            allowNegativeStock: false,
            isActive: true,
            visibleInEShop: false,
            attributeValues: def.attributeValues,
          }),
        );

        if (def.isPrimary && sample.key) {
          sampleVariantIds[sample.key] = variant.id;
        }

        if (def.stock != null && trackInventory) {
          await this.stockLevelRepo.save(
            this.stockLevelRepo.create({
              companyId,
              productVariantId: variant.id,
              storageId: storage.id,
              physicalStock: def.stock,
              committedStock: 0,
              availableStock: def.stock,
              incomingStock: 0,
            }),
          );
        }
      }
    }

    this.logger.log(
      `Lite demo products company=${companyId} created=${createdProducts} skippedSkus=${skippedSkus}`,
    );

    return { createdProducts, skippedSkus, sampleVariantIds };
  }

  async runMinimalSeed(): Promise<LiteSeedResult> {
    const adminUserName = process.env.LITE_SEED_ADMIN_USERNAME?.trim() || 'admin';
    const adminPassword =
      process.env.LITE_SEED_ADMIN_PASSWORD?.trim() || 'admin1234';
    const cashierUserName = 'cajero';
    const cashierPassword = 'cajero1234';

    const existing = await this.userRepo.findOne({
      where: { userName: adminUserName },
    });
    if (existing) {
      const companyId = existing.companyId;
      if (companyId) {
        const units = await this.ensureUnitsCatalog(companyId);
        const tax = await this.ensureTaxonomyCatalog(companyId);
        const demo = await this.ensureDemoProducts(companyId);
        return {
          seeded: false,
          adminUserName,
          adminUserId: existing.id,
          companyId,
          sampleVariantIds: demo.sampleVariantIds,
          message: `Admin ya existe; unidades (creadas: ${units.created.join(',') || '—'}; sync: ${units.synced.join(',') || '—'}); categorías: ${tax.categoriesCreated.join(',') || '—'}; atributos: ${tax.attributesCreated.join(',') || '—'}; productos demo (+${demo.createdProducts}, skip ${demo.skippedSkus})`,
        };
      }
      return {
        seeded: false,
        adminUserName,
        adminUserId: existing.id,
        companyId: existing.companyId ?? undefined,
        message: 'Admin user already exists; seed skipped',
      };
    }

    const company = await this.companyRepo.save(
      this.companyRepo.create({
        razonSocial: 'Mi Tienda Lite',
        nombreFantasia: 'KaiStore Lite',
        rut: '76.000.000-0',
        kaiProduct: 'kaistore',
        defaultCurrency: 'CLP',
        isActive: true,
      }),
    );

    const branch = await this.branchRepo.save(
      this.branchRepo.create({
        companyId: company.id,
        name: 'Sucursal principal',
        isHeadquarters: true,
        isActive: true,
      }),
    );

    await this.ensureUnitsCatalog(company.id);
    await this.ensureTaxonomyCatalog(company.id);

    await this.taxRepo.save(
      this.taxRepo.create({
        companyId: company.id,
        name: 'IVA 19%',
        code: 'IVA19',
        taxType: TaxType.IVA,
        rate: 19,
        isDefault: true,
        isActive: true,
        nonDeletable: true,
      }),
    );

    const storage = await this.storageRepo.save(
      this.storageRepo.create({
        companyId: company.id,
        branchId: branch.id,
        name: 'Sala de venta',
        code: 'STORE',
        type: StorageType.STORE,
        category: StorageCategory.IN_BRANCH,
        isDefault: true,
        isActive: true,
      }),
    );

    const pos = await this.posRepo.save(
      this.posRepo.create({
        companyId: company.id,
        branchId: branch.id,
        storageId: storage.id,
        name: 'Caja 1',
        isActive: true,
        settings: {
          enabledPaymentMethods: [
            'CASH',
            'CREDIT_CARD',
            'DEBIT_CARD',
            'TRANSFER',
          ],
        },
      }),
    );

    const rounds = this.config.app.security.bcryptRounds;

    const adminPerson = await this.personRepo.save(
      this.personRepo.create({
        type: PersonType.NATURAL,
        firstName: 'Admin',
        lastName: 'Lite',
        email: 'admin@kaistore-lite.local',
        documentNumber: '11.111.111-1',
        companyId: company.id,
      }),
    );

    const adminUser = await this.userRepo.save(
      this.userRepo.create({
        userName: adminUserName,
        pass: await bcrypt.hash(adminPassword, rounds),
        mail: adminPerson.email!,
        rol: UserRole.ADMIN,
        companyId: company.id,
        person: adminPerson,
      }),
    );

    const adminMembership = await this.membershipRepo.save(
      this.membershipRepo.create({
        userId: adminUser.id,
        companyId: company.id,
        isOwner: true,
        isActive: true,
      }),
    );
    await this.roleRepo.save(
      this.roleRepo.create({
        membershipId: adminMembership.id,
        role: PlatformRoleCode.ADMIN,
      }),
    );

    const cashierPerson = await this.personRepo.save(
      this.personRepo.create({
        type: PersonType.NATURAL,
        firstName: 'Cajero',
        lastName: 'Lite',
        email: 'cajero@kaistore-lite.local',
        documentNumber: '22.222.222-2',
        companyId: company.id,
      }),
    );

    const cashierUser = await this.userRepo.save(
      this.userRepo.create({
        userName: cashierUserName,
        pass: await bcrypt.hash(cashierPassword, rounds),
        mail: cashierPerson.email!,
        rol: UserRole.POS_OPERATOR,
        companyId: company.id,
        person: cashierPerson,
      }),
    );

    const cashierMembership = await this.membershipRepo.save(
      this.membershipRepo.create({
        userId: cashierUser.id,
        companyId: company.id,
        isOwner: false,
        isActive: true,
      }),
    );
    await this.roleRepo.save(
      this.roleRepo.create({
        membershipId: cashierMembership.id,
        role: PlatformRoleCode.POS_OPERATOR,
      }),
    );

    const demo = await this.ensureDemoProducts(company.id);
    const sampleVariantIds = demo.sampleVariantIds;

    const customerPerson = await this.personRepo.save(
      this.personRepo.create({
        type: PersonType.NATURAL,
        firstName: 'Cliente',
        lastName: 'contado',
        email: 'cliente@kaistore-lite.local',
        documentNumber: '33.333.333-3',
        companyId: company.id,
      }),
    );
    await this.customerRepo.save(
      this.customerRepo.create({
        companyId: company.id,
        personId: customerPerson.id,
        creditLimit: 100000,
        currentBalance: 0,
        isActive: true,
      }),
    );

    const supplierPerson = await this.personRepo.save(
      this.personRepo.create({
        type: PersonType.COMPANY,
        firstName: 'Proveedor',
        lastName: 'demo',
        businessName: 'Proveedor demo',
        email: 'proveedor@kaistore-lite.local',
        documentNumber: '76.111.111-1',
        companyId: company.id,
      }),
    );
    await this.supplierRepo.save(
      this.supplierRepo.create({
        companyId: company.id,
        personId: supplierPerson.id,
        alias: 'Proveedor demo',
        isActive: true,
      }),
    );

    this.logger.log(
      `Lite seed created company=${company.id} admin=${adminUserName} cashier=${cashierUserName}`,
    );

    return {
      seeded: true,
      companyId: company.id,
      adminUserId: adminUser.id,
      adminUserName,
      cashierUserName,
      branchId: branch.id,
      storageId: storage.id,
      posId: pos.id,
      sampleVariantIds,
      message: `Minimal Lite seed completed (+${demo.createdProducts} productos demo)`,
    };
  }
}
