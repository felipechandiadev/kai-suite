#!/usr/bin/env ts-node
/** Seed Mias — KaiFood con catálogo uniCenta. `npm run seed:mias` */

import '../shared/ensure-seed-local-storage-path';
import { NestFactory } from '@nestjs/core';
import { DataSource, IsNull, type Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { MinimalSeedModule } from '../shared/minimal-seed.module';
import { User, UserRole } from '@modules/users/domain/user.entity';
import { UserCompanyMembership } from '@modules/users/domain/user-company-membership.entity';
import { UserCompanyRole } from '@modules/users/domain/user-company-role.entity';
import { UserCompanyPerson } from '@modules/users/domain/user-company-person.entity';
import { PlatformRoleCode } from '@modules/users/domain/platform-role.codes';
import {
  Person,
  PersonType,
  DocumentType,
} from '@modules/persons/domain/person.entity';
import { Company } from '@modules/companies/domain/company.entity';
import { Tax, TaxType } from '@modules/taxes/domain/tax.entity';
import { Branch } from '@modules/branches/domain/branch.entity';
import { Unit } from '@modules/units/domain/unit.entity';
import { UnitDimension } from '@modules/units/domain/unit-dimension.enum';
import { Category } from '@modules/categories/domain/category.entity';
import { PriceList, PriceListType } from '@modules/price-lists/domain/price-list.entity';
import { PointOfSale } from '@modules/points-of-sale/domain/point-of-sale.entity';
import { CashHub } from '@modules/cash-hubs/domain/cash-hub.entity';
import { ExpenseCategory } from '@modules/expense-categories/domain/expense-category.entity';
import { assertValidChileCompanyRut } from '@shared/utils/chile-company-rut.util';
import { Brand } from '@modules/brands/domain/brand.entity';
import { Product, ProductType } from '@modules/products/domain/product.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { ProductVariantProductionUnit } from '@modules/product-variants/domain/product-variant-production-unit.entity';
import { PriceListItem } from '@modules/price-list-items/domain/price-list-item.entity';
import {
  Storage,
  StorageCategory,
  StorageType,
} from '@modules/storages/domain/storage.entity';
import { DiningRoom } from '@modules/dining/domain/dining-room.entity';
import { DiningTable } from '@modules/dining/domain/dining-table.entity';
import { DiningBranchSettings } from '@modules/dining/domain/dining-branch-settings.entity';
import { TableShape } from '@modules/dining/domain/dining.enums';
import { sanitizeCompanyTipSettings } from '@modules/companies/domain/company-tips.types';
import { buildDefaultCompanyMenuTopBarSettings } from '@modules/companies/domain/company-menu-topbar.types';
import { buildDefaultCompanyMenuAboutSettings } from '@modules/companies/domain/company-menu-about.types';
import { buildDefaultCompanyMenuFindUsSettings } from '@modules/companies/domain/company-menu-find-us.types';
import { buildDefaultCompanyMenuThemeSettings } from '@modules/companies/domain/company-menu-theme.types';
import { HrLaborUnit } from '@modules/hr-labor-units/domain/hr-labor-unit.entity';
import { HrLaborUnitBranch } from '@modules/hr-labor-units/domain/hr-labor-unit-branch.entity';
import { HrLaborUnitProductionUnit } from '@modules/hr-labor-units/domain/hr-labor-unit-production-unit.entity';
import { HrLaborUnitShift } from '@modules/hr-jornada/domain/hr-labor-unit-shift.entity';
import { ProductionUnit } from '@modules/production-units/domain/production-unit.entity';
import {
  KitchenFulfillmentMode,
  ProductionUnitInventoryMode,
  ProductionUnitPurpose,
  ProductionUnitScope,
} from '@modules/production-units/domain/production-unit.enums';
import { Shareholder } from '@modules/shareholders/domain/shareholder.entity';
import { Supplier } from '@modules/suppliers/domain/supplier.entity';
import { Customer } from '@modules/customers/domain/customer.entity';
import { TenantContext } from '@common/tenant/tenant.context';
import { runSeedBootstrapGuards } from '../shared/seed-bootstrap.util';
import {
  seedProductsFromDefinitions,
  syncSeedBrands,
  syncSeedCategories,
} from '../shared/seed-catalog.util';
import { seedExpenseCategoriesForCompany } from '../shared/seed-expense-categories';
import type { SeedUnitKey } from '../shared/seed-catalog.types';
import {
  SEED_BRANCH,
  SEED_BRAND_NAME,
  SEED_CUSTOMER,
  SEED_MIAS_COMPANY,
  SEED_MIAS_PAYMENTS,
  SEED_MIAS_USERS,
  SEED_PASSWORD,
  SEED_POS_NAME,
  SEED_PRICE_LIST_RETAIL_NAME,
  SEED_SHAREHOLDER,
  SEED_SUPPLIER,
  SEED_UNIT_BASE_NAME,
  SEED_UNIT_BASE_SYMBOL,
  buildSeedCompanyBankAccounts,
  buildSeedCompanyPaymentCatalog,
  buildSeedCompanySettings,
  buildSeedEmployeeBankAccount,
  buildSeedPosPaymentList,
} from './config';
import {
  loadMiasCatalog,
  mapMiasCatalogToSeedProducts,
} from './load-catalog';

const SEED_IVA_DESCRIPTION =
  'Impuesto al Valor Agregado sobre ventas, servicios e importaciones.';

async function ensureCompany(
  companyRepo: Repository<Company>,
): Promise<{
  company: Company;
  paymentCatalog: ReturnType<typeof buildSeedCompanyPaymentCatalog>;
}> {
  const def = SEED_MIAS_COMPANY;
  assertValidChileCompanyRut(def.rut, def.nombreFantasia);
  let company = await companyRepo.findOne({
    where: { rut: def.rut, deletedAt: IsNull() },
  });
  if (!company) {
    company = companyRepo.create({
      razonSocial: def.razonSocial,
      nombreFantasia: def.nombreFantasia,
      businessActivity: def.businessActivity,
      rut: def.rut,
      address: def.address,
      mail: def.mail,
      phone: def.phone,
      defaultCurrency: def.defaultCurrency,
      kaiProduct: def.kaiProduct,
      isActive: true,
    });
    await companyRepo.save(company);
    console.log(`✅ Empresa creada: ${company.nombreFantasia} (${company.rut})`);
  } else {
    company.razonSocial = def.razonSocial;
    company.nombreFantasia = def.nombreFantasia;
    company.businessActivity = def.businessActivity;
    company.address = def.address;
    company.mail = def.mail;
    company.phone = def.phone;
    company.kaiProduct = def.kaiProduct;
    await companyRepo.save(company);
    console.log(`✅ Empresa sincronizada: ${company.nombreFantasia}`);
  }

  const paymentCatalog = buildSeedCompanyPaymentCatalog(SEED_MIAS_PAYMENTS);
  company.bankAccounts = buildSeedCompanyBankAccounts(
    SEED_MIAS_PAYMENTS,
    company.razonSocial,
  );
  company.settings = buildSeedCompanySettings({
    existing: company.settings as Record<string, unknown> | undefined,
    paymentMethods: paymentCatalog,
    kaiProduct: def.kaiProduct,
    menuPublicSlug: def.menuPublicSlug,
  });
  await companyRepo.save(company);
  return { company, paymentCatalog };
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(MinimalSeedModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const dataSource = app.get(DataSource);
    await runSeedBootstrapGuards(dataSource);

    const personRepo = dataSource.getRepository(Person);
    const companyRepo = dataSource.getRepository(Company);
    const taxRepo = dataSource.getRepository(Tax);
    const branchRepo = dataSource.getRepository(Branch);
    const unitRepo = dataSource.getRepository(Unit);
    const priceListRepo = dataSource.getRepository(PriceList);
    const posRepo = dataSource.getRepository(PointOfSale);
    const cashHubRepo = dataSource.getRepository(CashHub);
    const expenseCategoryRepo = dataSource.getRepository(ExpenseCategory);
    const userRepo = dataSource.getRepository(User);
    const productRepo = dataSource.getRepository(Product);
    const brandRepo = dataSource.getRepository(Brand);
    const categoryRepo = dataSource.getRepository(Category);
    const variantRepo = dataSource.getRepository(ProductVariant);
    const priceListItemRepo = dataSource.getRepository(PriceListItem);
    const storageRepo = dataSource.getRepository(Storage);
    const membershipRepo = dataSource.getRepository(UserCompanyMembership);
    const membershipRoleRepo = dataSource.getRepository(UserCompanyRole);
    const userCompanyPersonRepo = dataSource.getRepository(UserCompanyPerson);
    const shareholderRepo = dataSource.getRepository(Shareholder);
    const supplierRepo = dataSource.getRepository(Supplier);
    const customerRepo = dataSource.getRepository(Customer);

    const password = SEED_PASSWORD;
    const catalog = loadMiasCatalog();
    const { products: seedProducts, productionUnitBySku } =
      mapMiasCatalogToSeedProducts(catalog, SEED_BRAND_NAME);

    const { company, paymentCatalog } = await ensureCompany(companyRepo);

    const branchOps = await TenantContext.run(
      { activeCompanyId: company.id, userId: null, rol: null },
      async () => {
        let ivaTax = await taxRepo.findOne({
          where: { companyId: company.id, name: 'IVA', taxType: TaxType.IVA },
        });
        if (!ivaTax) {
          ivaTax = taxRepo.create({
            companyId: company.id,
            name: 'IVA',
            rate: 19,
            taxType: TaxType.IVA,
            code: null,
            description: SEED_IVA_DESCRIPTION,
            isDefault: true,
            isActive: true,
          });
          await taxRepo.save(ivaTax);
        } else {
          ivaTax.rate = 19;
          ivaTax.isActive = true;
          ivaTax.isDefault = true;
          await taxRepo.save(ivaTax);
        }

        const setCompanyDefaultUnit = async (defaultUnitId: string) => {
          await unitRepo.update(
            { companyId: company.id, deletedAt: IsNull() },
            { isDefault: false },
          );
          await unitRepo.update(
            { id: defaultUnitId, companyId: company.id },
            { isDefault: true },
          );
        };

        const upsertSeedUnit = async (args: {
          symbol: string;
          name: string;
          dimension: UnitDimension;
          isBase: boolean;
          conversionFactor: number;
          baseUnitId: string | null;
          allowDecimals: boolean;
        }): Promise<Unit> => {
          let u = await unitRepo.findOne({
            where: { symbol: args.symbol, companyId: company.id },
            withDeleted: true,
          });
          const isDefault =
            args.symbol.toLowerCase() === SEED_UNIT_BASE_SYMBOL.toLowerCase();
          if (!u) {
            u = unitRepo.create({ ...args, active: true, isDefault });
            await unitRepo.save(u);
          } else {
            if (u.deletedAt) u = await unitRepo.recover(u);
            Object.assign(u, { ...args, active: true, isDefault });
            await unitRepo.save(u);
          }
          if (isDefault) await setCompanyDefaultUnit(u.id);
          return u;
        };

        const baseUnit = await upsertSeedUnit({
          symbol: SEED_UNIT_BASE_SYMBOL,
          name: SEED_UNIT_BASE_NAME,
          dimension: UnitDimension.COUNT,
          isBase: true,
          conversionFactor: 1,
          baseUnitId: null,
          allowDecimals: false,
        });
        const unitMl = await upsertSeedUnit({
          symbol: 'ml',
          name: 'Mililitro',
          dimension: UnitDimension.VOLUME,
          isBase: true,
          conversionFactor: 1,
          baseUnitId: null,
          allowDecimals: true,
        });
        const unitLiter = await upsertSeedUnit({
          symbol: 'L',
          name: 'Litro',
          dimension: UnitDimension.VOLUME,
          isBase: false,
          conversionFactor: 1000,
          baseUnitId: unitMl.id,
          allowDecimals: true,
        });
        const unitGram = await upsertSeedUnit({
          symbol: 'g',
          name: 'Gramo',
          dimension: UnitDimension.MASS,
          isBase: true,
          conversionFactor: 1,
          baseUnitId: null,
          allowDecimals: true,
        });
        const unitKg = await upsertSeedUnit({
          symbol: 'kg',
          name: 'Kilogramo',
          dimension: UnitDimension.MASS,
          isBase: false,
          conversionFactor: 1000,
          baseUnitId: unitGram.id,
          allowDecimals: true,
        });
        const seedUnitId: Record<SeedUnitKey, string> = {
          UN: baseUnit.id,
          ML: unitMl.id,
          L: unitLiter.id,
          G: unitGram.id,
          KG: unitKg.id,
        };

        const categoryByName = await syncSeedCategories(
          categoryRepo,
          company.id,
          catalog.categories,
          SEED_BRAND_NAME,
          { silent: true },
        );
        const brandIdByName = await syncSeedBrands(
          brandRepo,
          company.id,
          [SEED_BRAND_NAME],
          SEED_BRAND_NAME,
        );

        let retailList = await priceListRepo.findOne({
          where: {
            companyId: company.id,
            name: SEED_PRICE_LIST_RETAIL_NAME,
          },
          withDeleted: true,
        });
        if (!retailList) {
          retailList = priceListRepo.create({
            companyId: company.id,
            name: SEED_PRICE_LIST_RETAIL_NAME,
            priceListType: PriceListType.RETAIL,
            isDefault: true,
            isActive: true,
          });
          await priceListRepo.save(retailList);
        } else {
          if (retailList.deletedAt) {
            retailList = await priceListRepo.recover(retailList);
          }
          retailList.isActive = true;
          retailList.priceListType = PriceListType.RETAIL;
          await priceListRepo.save(retailList);
        }
        await priceListRepo.update({ companyId: company.id }, { isDefault: false });
        await priceListRepo.update({ id: retailList.id }, { isDefault: true });

        await seedExpenseCategoriesForCompany({
          companyId: company.id,
          expenseCategoryRepo,
        });

        await seedProductsFromDefinitions(seedProducts, {
          companyId: company.id,
          productRepo,
          variantRepo,
          priceListItemRepo,
          ivaTax,
          categoryByName,
          brandIdByName,
          attributesByName: new Map(),
          seedUnitId,
          listaMinoristaId: retailList.id,
          listaMayoristaId: retailList.id,
          listaEshopId: retailList.id,
          logPrefix: SEED_BRAND_NAME,
          defaultStockQty: 0,
          silentProducts: true,
        });
        console.log(
          `✅ Productos sembrados: ${seedProducts.length} (trackInventory=false)`,
        );

        const site = SEED_BRANCH;
        const posPayments = buildSeedPosPaymentList(paymentCatalog);
        const priceListsJson = [
          { id: retailList.id, name: retailList.name, isActive: true },
        ];

        let seedBranch = await branchRepo.findOne({
          where: { companyId: company.id, name: site.name },
          withDeleted: true,
        });
        if (!seedBranch) {
          seedBranch = branchRepo.create({
            companyId: company.id,
            name: site.name,
            address: site.branchAddress,
            phone: site.branchPhone,
            location: site.branchLocation,
            isActive: true,
            isHeadquarters: site.isHeadquarters,
          });
          await branchRepo.save(seedBranch);
        } else {
          if (seedBranch.deletedAt) {
            seedBranch = await branchRepo.recover(seedBranch);
          }
          seedBranch.address = site.branchAddress;
          seedBranch.phone = site.branchPhone;
          seedBranch.location = site.branchLocation;
          seedBranch.isActive = true;
          seedBranch.isHeadquarters = site.isHeadquarters;
          await branchRepo.save(seedBranch);
        }

        let seedStorage = await storageRepo.findOne({
          where: { companyId: company.id, code: site.storageCode },
          withDeleted: true,
        });
        if (!seedStorage) {
          seedStorage = storageRepo.create({
            companyId: company.id,
            name: site.storageName,
            code: site.storageCode,
            branchId: seedBranch.id,
            type: StorageType.STORE,
            category: StorageCategory.IN_BRANCH,
            isDefault: true,
            isActive: true,
          });
          await storageRepo.save(seedStorage);
        } else {
          if (seedStorage.deletedAt) {
            seedStorage = await storageRepo.recover(seedStorage);
          }
          seedStorage.name = site.storageName;
          seedStorage.branchId = seedBranch.id;
          seedStorage.isDefault = true;
          seedStorage.isActive = true;
          await storageRepo.save(seedStorage);
        }

        let pos = await posRepo.findOne({
          where: {
            companyId: company.id,
            branchId: seedBranch.id,
            name: SEED_POS_NAME,
          },
          withDeleted: true,
        });
        if (!pos) {
          pos = posRepo.create({
            companyId: company.id,
            branchId: seedBranch.id,
            storageId: seedStorage.id,
            name: SEED_POS_NAME,
            defaultPriceListId: retailList.id,
            priceLists: priceListsJson,
            settings: { paymentMethods: posPayments },
            isActive: true,
          });
          await posRepo.save(pos);
        } else {
          if (pos.deletedAt) pos = await posRepo.recover(pos);
          pos.branchId = seedBranch.id;
          pos.storageId = seedStorage.id;
          pos.defaultPriceListId = retailList.id;
          pos.priceLists = priceListsJson;
          pos.settings = {
            ...(pos.settings ?? {}),
            paymentMethods: posPayments,
          };
          pos.isActive = true;
          await posRepo.save(pos);
        }

        let cashHub = await cashHubRepo.findOne({
          where: { companyId: company.id, code: site.cashHubCode },
          relations: ['branches', 'pointsOfSale'],
        });
        if (!cashHub) {
          cashHub = cashHubRepo.create({
            companyId: company.id,
            name: site.cashHubName,
            code: site.cashHubCode,
            isActive: true,
          });
          await cashHubRepo.save(cashHub);
        } else {
          cashHub.name = site.cashHubName;
          cashHub.isActive = true;
          await cashHubRepo.save(cashHub);
        }
        cashHub.branches = [seedBranch];
        cashHub.pointsOfSale = [pos];
        await cashHubRepo.save(cashHub);
        pos.defaultCashHubId = cashHub.id;
        await posRepo.save(pos);

        await productRepo
          .createQueryBuilder()
          .update(Product)
          .set({ onMenu: true })
          .where('companyId = :companyId', { companyId: company.id })
          .andWhere('productType != :insumo', {
            insumo: ProductType.INSUMO,
          })
          .execute();

        const diningRoomRepo = dataSource.getRepository(DiningRoom);
        const diningTableRepo = dataSource.getRepository(DiningTable);
        let room = await diningRoomRepo.findOne({
          where: { companyId: company.id, name: 'Salón principal' },
        });
        if (!room) {
          room = diningRoomRepo.create({
            companyId: company.id,
            branchId: seedBranch.id,
            name: 'Salón principal',
            isActive: true,
          });
        } else {
          room.branchId = seedBranch.id;
        }
        room = await diningRoomRepo.save(room);

        let table = await diningTableRepo.findOne({
          where: { diningRoomId: room.id, code: 'M1' },
        });
        if (!table) {
          table = diningTableRepo.create({
            diningRoomId: room.id,
            code: 'M1',
            label: 'Mesa 1',
            capacity: 4,
            shape: TableShape.RECT,
          });
        }
        await diningTableRepo.save(table);

        const diningSettingsRepo =
          dataSource.getRepository(DiningBranchSettings);
        let diningSettings = await diningSettingsRepo.findOne({
          where: { companyId: company.id, branchId: seedBranch.id },
        });
        if (!diningSettings) {
          diningSettings = diningSettingsRepo.create({
            companyId: company.id,
            branchId: seedBranch.id,
            allowPosOpenTable: true,
          });
        } else {
          diningSettings.allowPosOpenTable = true;
        }
        await diningSettingsRepo.save(diningSettings);

        const fresh = await companyRepo.findOne({ where: { id: company.id } });
        if (fresh) {
          fresh.settings = buildSeedCompanySettings({
            existing: fresh.settings as Record<string, unknown> | undefined,
            paymentMethods: paymentCatalog,
            kaiProduct: 'kaifood',
            menuPublicSlug: SEED_MIAS_COMPANY.menuPublicSlug,
            menuDefaultBranchId: seedBranch.id,
            menuDefaultPriceListId: retailList.id,
            menuExtras: {
              menuTopBar: buildDefaultCompanyMenuTopBarSettings(),
              menuAbout: buildDefaultCompanyMenuAboutSettings(),
              menuFindUs: {
                ...buildDefaultCompanyMenuFindUsSettings(),
                address: SEED_MIAS_COMPANY.address,
                phone: SEED_MIAS_COMPANY.phone,
              },
              menuTheme: buildDefaultCompanyMenuThemeSettings(),
            },
            tips: sanitizeCompanyTipSettings({
              enabled: true,
              suggestPercent: 10,
              allowCustomAmount: true,
              allowCashTips: true,
              distributionMode: 'DIRECT',
              distributionWeights: {},
            }) as unknown as Record<string, unknown>,
          });
          await companyRepo.save(fresh);
        }

        console.log(
          `✅ Sucursal ${site.name}: STORE · POS · salón 1 mesa · tips ON · menú=${SEED_MIAS_COMPANY.menuPublicSlug}`,
        );

        return {
          branchId: seedBranch.id,
          storageId: seedStorage.id,
          posId: pos.id,
        };
      },
    );

    const membershipRoleFromUserRole = (rol: UserRole): string => {
      if (rol === UserRole.OPERATOR || rol === UserRole.POS_OPERATOR) {
        return PlatformRoleCode.POS_OPERATOR;
      }
      if (rol === UserRole.WAITER) return PlatformRoleCode.WAITER;
      return rol;
    };

    const ensurePersonForCompany = async (params: {
      companyId: string;
      firstName: string;
      lastName: string;
      email: string;
      documentNumber: string;
      phone?: string;
      existing?: Person | null;
      bankAccount?: ReturnType<typeof buildSeedEmployeeBankAccount>;
    }): Promise<Person> => {
      let person =
        params.existing ??
        (await personRepo.findOne({
          where: {
            documentNumber: params.documentNumber,
            companyId: params.companyId,
            deletedAt: IsNull(),
          },
        }));
      if (!person) {
        person = personRepo.create({
          type: PersonType.NATURAL,
          firstName: params.firstName,
          lastName: params.lastName,
          documentType: DocumentType.RUT,
          documentNumber: params.documentNumber,
          email: params.email,
          phone: params.phone,
          companyId: params.companyId,
        });
      } else {
        person.firstName = params.firstName;
        person.lastName = params.lastName;
        person.documentType = DocumentType.RUT;
        person.documentNumber = params.documentNumber;
        person.email = params.email;
        if (params.phone) person.phone = params.phone;
        person.companyId = params.companyId;
      }
      if (params.bankAccount) {
        const byKey = new Map(
          (person.bankAccounts ?? []).map((a) => [
            a.accountKey ?? `${String(a.bankName)}_${a.accountNumber}`,
            a,
          ] as const),
        );
        byKey.set(params.bankAccount.accountKey!, params.bankAccount);
        person.bankAccounts = Array.from(byKey.values());
      }
      return personRepo.save(person);
    };

    const syncMembership = async (params: {
      user: User;
      companyId: string;
      role: string;
      person: Person;
      isOwner: boolean;
    }) => {
      let membership = await membershipRepo.findOne({
        where: { userId: params.user.id, companyId: params.companyId },
      });
      if (!membership) {
        membership = await membershipRepo.save(
          membershipRepo.create({
            userId: params.user.id,
            companyId: params.companyId,
            isOwner: params.isOwner,
            isActive: true,
          }),
        );
      } else {
        membership.isActive = true;
        membership.isOwner = params.isOwner;
        await membershipRepo.save(membership);
      }

      const existingRoles = await membershipRoleRepo.find({
        where: { membershipId: membership.id },
      });
      for (const r of existingRoles) {
        if (r.role !== params.role) {
          await membershipRoleRepo.delete({ id: r.id });
        }
      }
      const still = await membershipRoleRepo.find({
        where: { membershipId: membership.id },
      });
      if (!still.some((r) => r.role === params.role)) {
        await membershipRoleRepo.save(
          membershipRoleRepo.create({
            membershipId: membership.id,
            role: params.role,
          }),
        );
      }

      await userCompanyPersonRepo.upsert(
        {
          userId: params.user.id,
          companyId: params.companyId,
          personId: params.person.id,
        },
        ['userId', 'companyId'],
      );
    };

    const ensureUser = async (params: {
      userName: string;
      password: string;
      rol: UserRole;
      primaryCompanyId: string | null;
      nonDeletable: boolean;
      firstName: string;
      lastName: string;
      email: string;
      documentNumber: string;
      phone?: string;
      memberships?: Array<{ companyId: string; isOwner: boolean }>;
      withEmployeeBank?: boolean;
    }): Promise<User> => {
      let u = await userRepo.findOne({
        where: { userName: params.userName, deletedAt: IsNull() },
        relations: ['person'],
      });

      const isSuper = params.rol === UserRole.SUPER_ADMIN;
      let person: Person | null = null;

      const personCompanyId =
        params.primaryCompanyId ?? (isSuper ? company.id : null);
      if (personCompanyId) {
        person = await ensurePersonForCompany({
          companyId: personCompanyId,
          firstName: params.firstName,
          lastName: params.lastName,
          email: params.email,
          documentNumber: params.documentNumber,
          phone: params.phone,
          existing: u?.person ?? null,
          bankAccount: params.withEmployeeBank
            ? buildSeedEmployeeBankAccount(
                `${params.firstName} ${params.lastName}`.trim(),
                params.documentNumber,
              )
            : undefined,
        });
      }

      if (!u) {
        u = userRepo.create({
          userName: params.userName,
          pass: await bcrypt.hash(params.password, 12),
          mail: params.email,
          rol: params.rol,
          companyId: params.primaryCompanyId,
          nonDeletable: params.nonDeletable,
          person: person ?? undefined,
        });
        await userRepo.save(u);
        console.log(`✅ Usuario «${params.userName}» creado (${params.rol})`);
      } else {
        u.pass = await bcrypt.hash(params.password, 12);
        u.mail = params.email;
        u.rol = params.rol;
        u.companyId = params.primaryCompanyId;
        u.nonDeletable = params.nonDeletable;
        if (person) u.person = person;
        await userRepo.save(u);
        console.log(
          `✅ Usuario «${params.userName}» sincronizado (${params.rol})`,
        );
      }

      if (!isSuper && person && params.memberships?.length) {
        const role = membershipRoleFromUserRole(params.rol);
        for (const m of params.memberships) {
          await syncMembership({
            user: u,
            companyId: m.companyId,
            role,
            person,
            isOwner: m.isOwner,
          });
        }
      }

      return u;
    };

    await ensureUser({
      ...SEED_MIAS_USERS.superadmin,
      password,
      primaryCompanyId: null,
    });
    await ensureUser({
      ...SEED_MIAS_USERS.admin,
      password,
      primaryCompanyId: company.id,
      memberships: [{ companyId: company.id, isOwner: true }],
    });
    await ensureUser({
      ...SEED_MIAS_USERS.operador,
      password,
      primaryCompanyId: company.id,
      memberships: [{ companyId: company.id, isOwner: false }],
    });

    await TenantContext.run(
      { activeCompanyId: company.id, userId: null, rol: null },
      async () => {
        let shPerson = await personRepo.findOne({
          where: {
            documentNumber: SEED_SHAREHOLDER.documentNumber,
            companyId: company.id,
            deletedAt: IsNull(),
          },
        });
        if (!shPerson) {
          shPerson = await personRepo.save(
            personRepo.create({
              type: PersonType.NATURAL,
              firstName: SEED_SHAREHOLDER.firstName,
              lastName: SEED_SHAREHOLDER.lastName,
              documentType: SEED_SHAREHOLDER.documentType,
              documentNumber: SEED_SHAREHOLDER.documentNumber,
              companyId: company.id,
            }),
          );
        } else {
          shPerson.firstName = SEED_SHAREHOLDER.firstName;
          shPerson.lastName = SEED_SHAREHOLDER.lastName;
          await personRepo.save(shPerson);
        }
        let shRow = await shareholderRepo.findOne({
          where: {
            companyId: company.id,
            personId: shPerson.id,
            deletedAt: IsNull(),
          },
        });
        if (!shRow) {
          shRow = shareholderRepo.create({
            companyId: company.id,
            personId: shPerson.id,
            ownershipPercentage: SEED_SHAREHOLDER.ownershipPercentage,
            partnerType: SEED_SHAREHOLDER.partnerType,
            joinDate: SEED_SHAREHOLDER.joinDate,
            isActive: true,
          });
        } else {
          shRow.ownershipPercentage = SEED_SHAREHOLDER.ownershipPercentage;
          shRow.partnerType = SEED_SHAREHOLDER.partnerType;
          shRow.joinDate = SEED_SHAREHOLDER.joinDate;
          shRow.isActive = true;
        }
        await shareholderRepo.save(shRow);
        console.log(
          `✅ Socio ${SEED_SHAREHOLDER.firstName} 100%`,
        );

        let supPerson = await personRepo.findOne({
          where: {
            documentNumber: SEED_SUPPLIER.documentNumber,
            deletedAt: IsNull(),
          },
        });
        if (!supPerson) {
          supPerson = await personRepo.save(
            personRepo.create({
              type: PersonType.COMPANY,
              firstName: SEED_SUPPLIER.businessName,
              businessName: SEED_SUPPLIER.businessName,
              documentType: DocumentType.RUT,
              documentNumber: SEED_SUPPLIER.documentNumber,
              email: SEED_SUPPLIER.email,
              phone: SEED_SUPPLIER.phone,
              address: SEED_SUPPLIER.address,
              companyId: company.id,
            }),
          );
        }
        let supplier = await supplierRepo.findOne({
          where: { companyId: company.id, personId: supPerson.id },
          withDeleted: true,
        });
        if (!supplier) {
          supplier = supplierRepo.create({
            companyId: company.id,
            personId: supPerson.id,
            supplierType: SEED_SUPPLIER.supplierType,
            alias: SEED_SUPPLIER.alias,
            defaultPaymentTermDays: 30,
            isActive: true,
            notes: 'Proveedor de prueba seed Mias',
          });
        } else {
          if (supplier.deletedAt) supplier = await supplierRepo.recover(supplier);
          supplier.alias = SEED_SUPPLIER.alias;
          supplier.supplierType = SEED_SUPPLIER.supplierType;
          supplier.isActive = true;
        }
        await supplierRepo.save(supplier);
        console.log(`✅ Proveedor «${SEED_SUPPLIER.alias}»`);

        let custPerson = await personRepo.findOne({
          where: {
            documentNumber: SEED_CUSTOMER.documentNumber,
            deletedAt: IsNull(),
          },
        });
        if (!custPerson) {
          custPerson = await personRepo.save(
            personRepo.create({
              type: PersonType.NATURAL,
              firstName: SEED_CUSTOMER.firstName,
              lastName: SEED_CUSTOMER.lastName,
              documentType: DocumentType.RUT,
              documentNumber: SEED_CUSTOMER.documentNumber,
              email: SEED_CUSTOMER.email,
              phone: SEED_CUSTOMER.phone,
              address: SEED_CUSTOMER.address,
              companyId: company.id,
            }),
          );
        }
        let customer = await customerRepo.findOne({
          where: { companyId: company.id, personId: custPerson.id },
          withDeleted: true,
        });
        if (!customer) {
          customer = customerRepo.create({
            companyId: company.id,
            personId: custPerson.id,
            creditLimit: SEED_CUSTOMER.creditLimit,
            currentBalance: 0,
            paymentDayOfMonth: SEED_CUSTOMER.paymentDayOfMonth,
            isActive: true,
            notes: 'Cliente de prueba contado',
          });
        } else {
          if (customer.deletedAt) customer = await customerRepo.recover(customer);
          customer.creditLimit = SEED_CUSTOMER.creditLimit;
          customer.isActive = true;
        }
        await customerRepo.save(customer);
        console.log(
          `✅ Cliente «${SEED_CUSTOMER.firstName} ${SEED_CUSTOMER.lastName}» (crédito 0)`,
        );

        const laborUnitRepo = dataSource.getRepository(HrLaborUnit);
        const laborUnitBranchRepo = dataSource.getRepository(HrLaborUnitBranch);
        const laborUnitPuRepo = dataSource.getRepository(
          HrLaborUnitProductionUnit,
        );
        const laborUnitShiftRepo = dataSource.getRepository(HrLaborUnitShift);
        const productionUnitRepo = dataSource.getRepository(ProductionUnit);

        const ensureLaborUnitOnBranch = async (params: {
          code: string;
          name: string;
          description: string;
        }) => {
          let lu = await laborUnitRepo.findOne({
            where: { companyId: company.id, code: params.code },
          });
          if (!lu) {
            lu = await laborUnitRepo.save(
              laborUnitRepo.create({
                companyId: company.id,
                code: params.code,
                name: params.name,
                description: params.description,
                isActive: true,
              }),
            );
          } else {
            lu.name = params.name;
            lu.description = params.description;
            lu.isActive = true;
            lu = await laborUnitRepo.save(lu);
          }
          const link = await laborUnitBranchRepo.findOne({
            where: {
              laborUnitId: lu.id,
              branchId: branchOps.branchId,
            },
          });
          if (!link) {
            await laborUnitBranchRepo.save(
              laborUnitBranchRepo.create({
                companyId: company.id,
                laborUnitId: lu.id,
                branchId: branchOps.branchId,
              }),
            );
          }
          return lu;
        };

        let cocina = await productionUnitRepo.findOne({
          where: {
            companyId: company.id,
            branchId: branchOps.branchId,
            code: 'COCINA',
          },
        });
        if (!cocina) {
          cocina = await productionUnitRepo.save(
            productionUnitRepo.create({
              companyId: company.id,
              branchId: branchOps.branchId,
              scope: ProductionUnitScope.BRANCH,
              inventoryMode: ProductionUnitInventoryMode.DEPENDENT,
              purpose: ProductionUnitPurpose.KITCHEN,
              kitchenFulfillmentMode: KitchenFulfillmentMode.KDS,
              kitchenPrintSettings: null,
              code: 'COCINA',
              name: 'Cocina',
              defaultInputStorageId: branchOps.storageId,
              defaultOutputStorageId: null,
              isActive: true,
            }),
          );
        } else {
          cocina.name = 'Cocina';
          cocina.purpose = ProductionUnitPurpose.KITCHEN;
          cocina.kitchenFulfillmentMode = KitchenFulfillmentMode.KDS;
          cocina.inventoryMode = ProductionUnitInventoryMode.DEPENDENT;
          cocina.defaultInputStorageId = branchOps.storageId;
          cocina.isActive = true;
          cocina = await productionUnitRepo.save(cocina);
        }
        console.log(`✅ UP Cocina (KDS) id=${cocina.id.slice(0, 8)}…`);

        const salonLu = await ensureLaborUnitOnBranch({
          code: 'UL-SALON',
          name: 'Salón',
          description: 'Unidad laboral salón Mias',
        });

        const existingLuPu = await laborUnitPuRepo.findOne({
          where: {
            laborUnitId: salonLu.id,
            productionUnitId: cocina.id,
          },
        });
        if (!existingLuPu) {
          await laborUnitPuRepo.save(
            laborUnitPuRepo.create({
              companyId: company.id,
              laborUnitId: salonLu.id,
              productionUnitId: cocina.id,
            }),
          );
        }

        const schedule: Record<string, { start: string; end: string } | null> =
          {};
        for (let d = 0; d < 7; d++) {
          schedule[String(d)] = { start: '08:00', end: '21:00' };
        }
        let shift = await laborUnitShiftRepo.findOne({
          where: { companyId: company.id, code: 'ULS-MIAS-JORNADA' },
          withDeleted: true,
        });
        if (!shift) {
          shift = laborUnitShiftRepo.create({
            companyId: company.id,
            laborUnitId: salonLu.id,
            code: 'ULS-MIAS-JORNADA',
            name: 'Jornada Mias',
            scheduleJson: schedule,
            isActive: true,
            effectiveFrom: '2025-01-01',
          });
        } else {
          if (shift.deletedAt) {
            shift = await laborUnitShiftRepo.recover(shift);
          }
          shift.laborUnitId = salonLu.id;
          shift.name = 'Jornada Mias';
          shift.scheduleJson = schedule;
          shift.isActive = true;
          shift.effectiveFrom = '2025-01-01';
        }
        await laborUnitShiftRepo.save(shift);
        console.log(`✅ UL Salón + turno ${shift.code}`);

        const pvPuRepo = dataSource.getRepository(ProductVariantProductionUnit);
        let routed = 0;
        for (const [sku, code] of productionUnitBySku) {
          if (code !== 'COCINA') continue;
          const variant = await variantRepo.findOne({
            where: { companyId: company.id, sku, deletedAt: IsNull() },
          });
          if (!variant) continue;
          let row = await pvPuRepo.findOne({
            where: {
              companyId: company.id,
              productVariantId: variant.id,
              branchId: branchOps.branchId,
              productionUnitId: cocina.id,
            },
          });
          if (!row) {
            row = pvPuRepo.create({
              companyId: company.id,
              productVariantId: variant.id,
              branchId: branchOps.branchId,
              productionUnitId: cocina.id,
              isDefault: true,
            });
            await pvPuRepo.save(row);
            routed += 1;
          }
        }
        console.log(`✅ Routing variante→UP Cocina: ${routed} vínculos nuevos`);
      },
    );

    console.log('✅ Seed Mias OK');
    console.log(
      `   • ${SEED_MIAS_COMPANY.nombreFantasia} (${SEED_MIAS_COMPANY.rut}) · kaifood · ${catalog.products.length} productos`,
    );
    console.log(
      `   • Menú ${SEED_MIAS_COMPANY.menuPublicSlug} · UP Cocina (KDS) · 1 mesa · tips ON`,
    );
    console.log(`   • Password seed: ${password}`);
    console.log(
      `   • superadmin / ${password}  · admin / ${password}  · operador / ${password}`,
    );
  } finally {
    await app.close();
  }
}

bootstrap().catch((err) => {
  console.error('❌ Seed Mias falló', err);
  process.exit(1);
});
