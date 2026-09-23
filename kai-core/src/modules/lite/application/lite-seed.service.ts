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
        return {
          seeded: false,
          adminUserName,
          adminUserId: existing.id,
          companyId,
          message: `Admin ya existe; unidades (creadas: ${units.created.join(',') || '—'}; sync: ${units.synced.join(',') || '—'}); categorías: ${tax.categoriesCreated.join(',') || '—'}; atributos: ${tax.attributesCreated.join(',') || '—'}`,
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

    const { baseUnit: unit } = await this.ensureUnitsCatalog(company.id);
    await this.ensureTaxonomyCatalog(company.id);
    const tallaAttr = await this.attributeRepo.findOne({
      where: { companyId: company.id, name: 'Talla' },
    });

    const tax = await this.taxRepo.save(
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

    const sampleProducts: Array<{
      name: string;
      type: ProductType;
      sku: string;
      basePrice: number;
      stock?: number;
      key: 'physical' | 'service' | 'pack';
      /** Extra sibling variants (same product) for multi-variant smoke. */
      extraVariants?: Array<{
        sku: string;
        basePrice: number;
        stock?: number;
        attributeValues?: Record<string, string>;
      }>;
      attributeValues?: Record<string, string>;
    }> = [
      {
        name: 'Producto físico',
        type: ProductType.PHYSICAL,
        sku: 'P-001-S',
        basePrice: 1990,
        stock: 20,
        key: 'physical',
        attributeValues:
          tallaAttr != null ? { [tallaAttr.id]: 'S' } : undefined,
        extraVariants: [
          {
            sku: 'P-001-M',
            basePrice: 1990,
            stock: 15,
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
    ];

    const sampleVariantIds: LiteSeedResult['sampleVariantIds'] = {};

    for (const sample of sampleProducts) {
      const product = await this.productRepo.save(
        this.productRepo.create({
          companyId: company.id,
          name: sample.name,
          productType: sample.type,
          taxIds: [tax.id],
          baseUnitId: unit.id,
          isActive: true,
          visibleInEShop: false,
          onMenu: false,
        }),
      );

      const trackInventory = sample.type === ProductType.PHYSICAL;
      const variantDefs: Array<{
        sku: string;
        basePrice: number;
        stock?: number;
        attributeValues?: Record<string, string>;
        isPrimary?: boolean;
      }> = [
        {
          sku: sample.sku,
          basePrice: sample.basePrice,
          stock: sample.stock,
          attributeValues: sample.attributeValues,
          isPrimary: true,
        },
        ...(sample.extraVariants ?? []).map((ev) => ({
          ...ev,
          isPrimary: false as const,
        })),
      ];

      for (const def of variantDefs) {
        const variant = await this.variantRepo.save(
          this.variantRepo.create({
            companyId: company.id,
            productId: product.id,
            sku: def.sku,
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

        if (def.isPrimary) {
          sampleVariantIds[sample.key] = variant.id;
        }

        if (def.stock != null && trackInventory) {
          await this.stockLevelRepo.save(
            this.stockLevelRepo.create({
              companyId: company.id,
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
      message: 'Minimal Lite seed completed',
    };
  }
}
