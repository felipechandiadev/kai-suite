#!/usr/bin/env ts-node
/** Seed Barco dual — El Barco (kaistore) + Ohlala (kaifood). `npm run seed:barco` */

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
import { PriceListItem } from '@modules/price-list-items/domain/price-list-item.entity';
import {
  Storage,
  StorageCategory,
  StorageType,
} from '@modules/storages/domain/storage.entity';
import { StockLevel } from '@modules/stock-levels/domain/stock-level.entity';
import { DiningRoom } from '@modules/dining/domain/dining-room.entity';
import { DiningTable } from '@modules/dining/domain/dining-table.entity';
import { DiningBranchSettings } from '@modules/dining/domain/dining-branch-settings.entity';
import { TableShape } from '@modules/dining/domain/dining.enums';
import { sanitizeCompanyTipSettings } from '@modules/companies/domain/company-tips.types';
import { buildDefaultCompanyMenuTopBarSettings } from '@modules/companies/domain/company-menu-topbar.types';
import { buildDefaultCompanyMenuAboutSettings } from '@modules/companies/domain/company-menu-about.types';
import { buildDefaultCompanyMenuFindUsSettings } from '@modules/companies/domain/company-menu-find-us.types';
import { buildDefaultCompanyMenuThemeSettings } from '@modules/companies/domain/company-menu-theme.types';
import {
  Employee,
  EmployeeStatus,
  EmploymentType,
} from '@modules/employees/domain/employee.entity';
import { EmploymentContract } from '@modules/employees/domain/employment-contract.entity';
import {
  EmploymentContractKind,
  EmploymentContractStatus,
  SalesCommissionType,
} from '@modules/employees/domain/employment-contract.enums';
import { HrLaborUnit } from '@modules/hr-labor-units/domain/hr-labor-unit.entity';
import { HrLaborUnitBranch } from '@modules/hr-labor-units/domain/hr-labor-unit-branch.entity';
import { HrLaborUnitProductionUnit } from '@modules/hr-labor-units/domain/hr-labor-unit-production-unit.entity';
import { HrLaborUnitShift } from '@modules/hr-jornada/domain/hr-labor-unit-shift.entity';
import { ProductionUnit } from '@modules/production-units/domain/production-unit.entity';
import {
  ProductionUnitInventoryMode,
  ProductionUnitPurpose,
  ProductionUnitScope,
} from '@modules/production-units/domain/production-unit.enums';
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
  SEED_BARCO_COMPANY,
  SEED_BARCO_SITE,
  SEED_BARCO_USERS,
  SEED_BRANCH_NAME,
  SEED_OHLALA_COMPANY,
  SEED_OHLALA_SITE,
  SEED_PASSWORD,
  SEED_POS_NAME,
  SEED_PRICE_LIST_RETAIL_NAME,
  SEED_UNIT_BASE_NAME,
  SEED_UNIT_BASE_SYMBOL,
  buildSeedCompanyBankAccounts,
  buildSeedCompanyPaymentCatalog,
  buildSeedCompanySettings,
  buildSeedPosPaymentList,
  type SeedCompanySite,
} from './config';
import {
  barcoInitialStockBySku,
  loadBarcoCatalogFile,
  mapBarcoCatalogToSeedProducts,
} from './load-catalog';

const SEED_IVA_DESCRIPTION =
  'Impuesto al Valor Agregado sobre ventas, servicios e importaciones.';

type CompanyDef = typeof SEED_BARCO_COMPANY | typeof SEED_OHLALA_COMPANY;

async function ensureCompany(
  companyRepo: Repository<Company>,
  def: CompanyDef,
  site: SeedCompanySite,
): Promise<{ company: Company; paymentCatalog: ReturnType<typeof buildSeedCompanyPaymentCatalog> }> {
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

  const paymentCatalog = buildSeedCompanyPaymentCatalog(site);
  company.bankAccounts = buildSeedCompanyBankAccounts(site, company.razonSocial);
  company.settings = buildSeedCompanySettings({
    existing: company.settings as Record<string, unknown> | undefined,
    paymentMethods: paymentCatalog,
    kaiProduct: def.kaiProduct,
    eShopSlug: 'eShopSlug' in def ? def.eShopSlug : undefined,
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
    const categoryRepo = dataSource.getRepository(Category);
    const priceListRepo = dataSource.getRepository(PriceList);
    const posRepo = dataSource.getRepository(PointOfSale);
    const cashHubRepo = dataSource.getRepository(CashHub);
    const expenseCategoryRepo = dataSource.getRepository(ExpenseCategory);
    const userRepo = dataSource.getRepository(User);
    const productRepo = dataSource.getRepository(Product);
    const brandRepo = dataSource.getRepository(Brand);
    const variantRepo = dataSource.getRepository(ProductVariant);
    const priceListItemRepo = dataSource.getRepository(PriceListItem);
    const storageRepo = dataSource.getRepository(Storage);
    const stockLevelRepo = dataSource.getRepository(StockLevel);
    const membershipRepo = dataSource.getRepository(UserCompanyMembership);
    const membershipRoleRepo = dataSource.getRepository(UserCompanyRole);
    const userCompanyPersonRepo = dataSource.getRepository(UserCompanyPerson);

    const password = SEED_PASSWORD;
    const storeCatalog = loadBarcoCatalogFile('store');
    const foodCatalog = loadBarcoCatalogFile('food');

    const { company: companyStore, paymentCatalog: payStore } = await ensureCompany(
      companyRepo,
      SEED_BARCO_COMPANY,
      SEED_BARCO_SITE,
    );
    const { company: companyFood, paymentCatalog: payFood } = await ensureCompany(
      companyRepo,
      SEED_OHLALA_COMPANY,
      SEED_OHLALA_SITE,
    );

    const seedCompanyOps = async (params: {
      company: Company;
      site: SeedCompanySite;
      paymentCatalog: ReturnType<typeof buildSeedCompanyPaymentCatalog>;
      catalog: ReturnType<typeof loadBarcoCatalogFile>;
      brandName: string;
      foodExtras?: boolean;
    }) => {
      const { company, site, paymentCatalog, catalog, brandName, foodExtras } =
        params;
      const seedProducts = mapBarcoCatalogToSeedProducts(catalog, brandName);
      const stockBySku = barcoInitialStockBySku(catalog);

      return TenantContext.run(
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

          let seedBranch = await branchRepo.findOne({
            where: { companyId: company.id, name: SEED_BRANCH_NAME },
            withDeleted: true,
          });
          if (!seedBranch) {
            seedBranch = branchRepo.create({
              companyId: company.id,
              name: SEED_BRANCH_NAME,
              address: site.branchAddress,
              phone: site.branchPhone,
              location: site.branchLocation,
              isActive: true,
              isHeadquarters: true,
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
            seedBranch.isHeadquarters = true;
            await branchRepo.save(seedBranch);
          }
          await branchRepo.update({ companyId: company.id }, { isHeadquarters: false });
          seedBranch.isHeadquarters = true;
          await branchRepo.save(seedBranch);

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
          await storageRepo.update({ companyId: company.id }, { isDefault: false });
          await storageRepo.update({ id: seedStorage.id }, { isDefault: true });

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
            brandName,
            { silent: true },
          );
          const brandIdByName = await syncSeedBrands(
            brandRepo,
            company.id,
            [brandName],
            brandName,
          );

          let retailList = await priceListRepo.findOne({
            where: { companyId: company.id, name: SEED_PRICE_LIST_RETAIL_NAME },
            withDeleted: true,
          });
          if (!retailList) {
            retailList = priceListRepo.create({
              companyId: company.id,
              name: SEED_PRICE_LIST_RETAIL_NAME,
              priceListType: PriceListType.RETAIL,
              isDefault: true,
              priority: 0,
              nonDeletable: true,
              isActive: true,
            });
            await priceListRepo.save(retailList);
          } else {
            if (retailList.deletedAt) {
              retailList = await priceListRepo.recover(retailList);
            }
            retailList.isDefault = true;
            retailList.isActive = true;
            retailList.priceListType = PriceListType.RETAIL;
            await priceListRepo.save(retailList);
          }
          await priceListRepo.update({ companyId: company.id }, { isDefault: false });
          await priceListRepo.update({ id: retailList.id }, { isDefault: true });

          const posPayments = buildSeedPosPaymentList(paymentCatalog);
          let pos = await posRepo.findOne({
            where: { companyId: company.id, name: SEED_POS_NAME },
            withDeleted: true,
          });
          if (!pos) {
            pos = posRepo.create({
              companyId: company.id,
              branchId: seedBranch.id,
              storageId: seedStorage.id,
              name: SEED_POS_NAME,
              defaultPriceListId: retailList.id,
              settings: { paymentMethods: posPayments },
              isActive: true,
            });
            await posRepo.save(pos);
          } else {
            if (pos.deletedAt) pos = await posRepo.recover(pos);
            pos.branchId = seedBranch.id;
            pos.storageId = seedStorage.id;
            pos.defaultPriceListId = retailList.id;
            pos.settings = {
              ...(pos.settings && typeof pos.settings === 'object' ? pos.settings : {}),
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

          await seedExpenseCategoriesForCompany({
            expenseCategoryRepo,
            companyId: company.id,
            logLabel: company.nombreFantasia ?? company.id,
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
            logPrefix: brandName,
            defaultStockQty: 0,
          });

          const variants = await variantRepo.find({
            where: { companyId: company.id, deletedAt: IsNull() },
            select: ['id', 'sku'],
          });
          let stockUpserts = 0;
          for (const v of variants) {
            const qty = stockBySku.get(v.sku) ?? 0;
            if (qty <= 0) continue;
            let level = await stockLevelRepo.findOne({
              where: {
                companyId: company.id,
                productVariantId: v.id,
                storageId: seedStorage.id,
              },
            });
            if (!level) {
              level = stockLevelRepo.create({
                companyId: company.id,
                productVariantId: v.id,
                storageId: seedStorage.id,
                physicalStock: qty,
                committedStock: 0,
                availableStock: qty,
                incomingStock: 0,
              });
            } else {
              level.physicalStock = qty;
              level.availableStock = qty;
            }
            await stockLevelRepo.save(level);
            stockUpserts += 1;
          }
          console.log(
            `✅ ${brandName}: ${seedProducts.length} productos · stock en ${stockUpserts} variantes`,
          );

          if (foodExtras) {
            await productRepo
              .createQueryBuilder()
              .update(Product)
              .set({ onMenu: true })
              .where('companyId = :companyId', { companyId: company.id })
              .andWhere('productType != :insumo', { insumo: ProductType.INSUMO })
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
            }
            room = await diningRoomRepo.save(room);
            for (let i = 1; i <= 6; i++) {
              const code = `M${i}`;
              let table = await diningTableRepo.findOne({
                where: { diningRoomId: room.id, code },
              });
              if (!table) {
                table = diningTableRepo.create({
                  diningRoomId: room.id,
                  code,
                  label: `Mesa ${i}`,
                  capacity: 4,
                  shape: TableShape.RECT,
                });
              }
              await diningTableRepo.save(table);
            }

            const diningSettingsRepo = dataSource.getRepository(DiningBranchSettings);
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
                menuPublicSlug: SEED_OHLALA_COMPANY.menuPublicSlug,
                menuDefaultBranchId: seedBranch.id,
                menuDefaultPriceListId: retailList.id,
                menuExtras: {
                  menuTopBar: buildDefaultCompanyMenuTopBarSettings(),
                  menuAbout: buildDefaultCompanyMenuAboutSettings(),
                  menuFindUs: {
                    ...buildDefaultCompanyMenuFindUsSettings(),
                    address: SEED_OHLALA_COMPANY.address,
                    phone: SEED_OHLALA_COMPANY.phone,
                  },
                  menuTheme: buildDefaultCompanyMenuThemeSettings(),
                },
                tips: sanitizeCompanyTipSettings({
                  enabled: false,
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
              `✅ Ohlala: on_menu, salón 6 mesas, carta slug=${SEED_OHLALA_COMPANY.menuPublicSlug}`,
            );
          }

          return { branchId: seedBranch.id, storageId: seedStorage.id };
        },
      );
    };

    const storeOps = await seedCompanyOps({
      company: companyStore,
      site: SEED_BARCO_SITE,
      paymentCatalog: payStore,
      catalog: storeCatalog,
      brandName: SEED_BARCO_SITE.brandName,
    });
    const foodOps = await seedCompanyOps({
      company: companyFood,
      site: SEED_OHLALA_SITE,
      paymentCatalog: payFood,
      catalog: foodCatalog,
      brandName: SEED_OHLALA_SITE.brandName,
      foodExtras: true,
    });

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
      /** Companies to attach membership to (ADMIN/OPERATOR/WAITER). */
      memberships?: Array<{ companyId: string; isOwner: boolean }>;
    }): Promise<User> => {
      let u = await userRepo.findOne({
        where: { userName: params.userName, deletedAt: IsNull() },
        relations: ['person'],
      });

      const isSuper = params.rol === UserRole.SUPER_ADMIN;
      let person: Person | null = null;

      // persons.company_id es NOT NULL: SUPER_ADMIN también tiene Person (hospedada en
      // El Barco), pero user.companyId=null y sin membership de tienda.
      const personCompanyId =
        params.primaryCompanyId ?? (isSuper ? companyStore.id : null);
      if (personCompanyId) {
        person = await ensurePersonForCompany({
          companyId: personCompanyId,
          firstName: params.firstName,
          lastName: params.lastName,
          email: params.email,
          documentNumber: params.documentNumber,
          phone: params.phone,
          existing: u?.person ?? null,
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
        console.log(`✅ Usuario «${params.userName}» sincronizado (${params.rol})`);
      }

      if (!isSuper && person && params.memberships?.length) {
        const role = membershipRoleFromUserRole(params.rol);
        for (const m of params.memberships) {
          // Persona espejo por empresa (admin/operador en dos empresas)
          const companyPerson =
            m.companyId === params.primaryCompanyId
              ? person
              : await ensurePersonForCompany({
                  companyId: m.companyId,
                  firstName: params.firstName,
                  lastName: params.lastName,
                  email: params.email,
                  documentNumber: params.documentNumber,
                  phone: params.phone,
                });
          await syncMembership({
            user: u,
            companyId: m.companyId,
            role,
            person: companyPerson,
            isOwner: m.isOwner,
          });
        }
      }

      return u;
    };

    await ensureUser({
      ...SEED_BARCO_USERS.superadmin,
      password,
      primaryCompanyId: null,
    });

    await ensureUser({
      ...SEED_BARCO_USERS.admin,
      password,
      primaryCompanyId: companyStore.id,
      memberships: [
        { companyId: companyStore.id, isOwner: true },
        { companyId: companyFood.id, isOwner: true },
      ],
    });

    await ensureUser({
      ...SEED_BARCO_USERS.operador,
      password,
      primaryCompanyId: companyStore.id,
      memberships: [
        { companyId: companyStore.id, isOwner: false },
        { companyId: companyFood.id, isOwner: false },
      ],
    });

    const meseroUser = await ensureUser({
      ...SEED_BARCO_USERS.mesero,
      password,
      primaryCompanyId: companyFood.id,
      memberships: [{ companyId: companyFood.id, isOwner: false }],
    });

    // Ohlala: Cocina (UP) + UL Cafetería (turno 09–21) + UL Salón + mesero tipsEligible
    await TenantContext.run(
      { activeCompanyId: companyFood.id, userId: null, rol: null },
      async () => {
        const laborUnitRepo = dataSource.getRepository(HrLaborUnit);
        const laborUnitBranchRepo = dataSource.getRepository(HrLaborUnitBranch);
        const laborUnitPuRepo = dataSource.getRepository(HrLaborUnitProductionUnit);
        const laborUnitShiftRepo = dataSource.getRepository(HrLaborUnitShift);
        const productionUnitRepo = dataSource.getRepository(ProductionUnit);

        const ensureLaborUnitOnBranch = async (params: {
          code: string;
          name: string;
          description: string;
        }) => {
          let lu = await laborUnitRepo.findOne({
            where: { companyId: companyFood.id, code: params.code },
          });
          if (!lu) {
            lu = await laborUnitRepo.save(
              laborUnitRepo.create({
                companyId: companyFood.id,
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
            where: { laborUnitId: lu.id, branchId: foodOps.branchId },
          });
          if (!link) {
            await laborUnitBranchRepo.save(
              laborUnitBranchRepo.create({
                companyId: companyFood.id,
                laborUnitId: lu.id,
                branchId: foodOps.branchId,
              }),
            );
          }
          return lu;
        };

        let cocina = await productionUnitRepo.findOne({
          where: {
            companyId: companyFood.id,
            branchId: foodOps.branchId,
            code: 'COCINA',
          },
        });
        if (!cocina) {
          cocina = await productionUnitRepo.save(
            productionUnitRepo.create({
              companyId: companyFood.id,
              branchId: foodOps.branchId,
              scope: ProductionUnitScope.BRANCH,
              inventoryMode: ProductionUnitInventoryMode.DEPENDENT,
              purpose: ProductionUnitPurpose.KITCHEN,
              code: 'COCINA',
              name: 'Cocina',
              defaultInputStorageId: foodOps.storageId,
              defaultOutputStorageId: null,
              isActive: true,
            }),
          );
          console.log(`✅ Ohlala UP Cocina id=${cocina.id}`);
        } else {
          cocina.name = 'Cocina';
          cocina.purpose = ProductionUnitPurpose.KITCHEN;
          cocina.inventoryMode = ProductionUnitInventoryMode.DEPENDENT;
          cocina.defaultInputStorageId = foodOps.storageId;
          cocina.isActive = true;
          cocina = await productionUnitRepo.save(cocina);
        }

        const cafeteriaLu = await ensureLaborUnitOnBranch({
          code: 'UL-CAFETERIA',
          name: 'Cafetería',
          description: 'Unidad laboral cafetería Ohlala',
        });

        const cafeSchedule: Record<string, { start: string; end: string } | null> =
          {};
        for (let d = 0; d < 7; d++) {
          cafeSchedule[String(d)] = { start: '09:00', end: '21:00' };
        }
        let cafeShift = await laborUnitShiftRepo.findOne({
          where: { companyId: companyFood.id, code: 'ULS-CAFE-JORNADA' },
          withDeleted: true,
        });
        if (!cafeShift) {
          cafeShift = laborUnitShiftRepo.create({
            companyId: companyFood.id,
            laborUnitId: cafeteriaLu.id,
            code: 'ULS-CAFE-JORNADA',
            name: 'Cafetería jornada',
            scheduleJson: cafeSchedule,
            timezone: 'America/Santiago',
            isActive: true,
            effectiveFrom: '2025-01-01',
            effectiveTo: null,
          });
        } else {
          if (cafeShift.deletedAt) {
            cafeShift = await laborUnitShiftRepo.recover(cafeShift);
          }
          cafeShift.laborUnitId = cafeteriaLu.id;
          cafeShift.name = 'Cafetería jornada';
          cafeShift.scheduleJson = cafeSchedule;
          cafeShift.isActive = true;
          cafeShift.effectiveFrom = '2025-01-01';
        }
        await laborUnitShiftRepo.save(cafeShift);
        console.log(
          `✅ Ohlala UL Cafetería + turno 09:00–21:00 (${cafeShift.code})`,
        );

        const cafePuLink = await laborUnitPuRepo.findOne({
          where: {
            laborUnitId: cafeteriaLu.id,
            productionUnitId: cocina.id,
          },
        });
        if (!cafePuLink) {
          await laborUnitPuRepo.save(
            laborUnitPuRepo.create({
              companyId: companyFood.id,
              laborUnitId: cafeteriaLu.id,
              productionUnitId: cocina.id,
            }),
          );
        }

        const salonLu = await ensureLaborUnitOnBranch({
          code: 'UL-SALON',
          name: 'Salón',
          description: 'Unidad laboral meseros Ohlala',
        });

        const meseroPerson = await personRepo.findOne({
          where: {
            documentNumber: SEED_BARCO_USERS.mesero.documentNumber,
            companyId: companyFood.id,
            deletedAt: IsNull(),
          },
        });
        if (!meseroPerson) {
          console.warn('⚠️ Persona mesero no encontrada; se omite employee');
          return;
        }

        const employeeRepo = dataSource.getRepository(Employee);
        const contractRepo = dataSource.getRepository(EmploymentContract);
        let employee = await employeeRepo.findOne({
          where: {
            companyId: companyFood.id,
            personId: meseroPerson.id,
            deletedAt: IsNull(),
          },
        });
        if (!employee) {
          employee = employeeRepo.create({
            companyId: companyFood.id,
            personId: meseroPerson.id,
            branchId: foodOps.branchId,
            laborUnitId: salonLu.id,
            employmentType: EmploymentType.FULL_TIME,
            status: EmployeeStatus.ACTIVE,
            hireDate: '2025-01-01',
          });
        } else {
          employee.branchId = foodOps.branchId;
          employee.laborUnitId = salonLu.id;
          employee.status = EmployeeStatus.ACTIVE;
        }
        employee = await employeeRepo.save(employee);

        let contract = await contractRepo.findOne({
          where: {
            companyId: companyFood.id,
            employeeId: employee.id,
            status: EmploymentContractStatus.ACTIVE,
          },
        });
        if (!contract) {
          contract = contractRepo.create({
            companyId: companyFood.id,
            employeeId: employee.id,
            branchId: foodOps.branchId,
            status: EmploymentContractStatus.ACTIVE,
            kind: EmploymentContractKind.LABOR,
            startDate: '2025-01-01',
            tipsEligible: true,
            salesCommissionType: SalesCommissionType.NONE,
            mealAllowance: '0',
            transportAllowance: '0',
          });
        } else {
          contract.tipsEligible = true;
          contract.branchId = foodOps.branchId;
        }
        await contractRepo.save(contract);
        console.log(
          `✅ Mesero empleado tipsEligible (user=${meseroUser.userName})`,
        );
      },
    );

    void storeOps;

    console.log('✅ Seed Barco dual OK');
    console.log(
      `   • ${SEED_BARCO_COMPANY.nombreFantasia} (${SEED_BARCO_COMPANY.rut}) · ${storeCatalog.products.length} productos`,
    );
    console.log(
      `   • ${SEED_OHLALA_COMPANY.nombreFantasia} (${SEED_OHLALA_COMPANY.rut}) · ${foodCatalog.products.length} productos · menú ${SEED_OHLALA_COMPANY.menuPublicSlug}`,
    );
    console.log(`   • Password seed: ${password}`);
    console.log(
      `   • superadmin / ${password}  (SUPER_ADMIN + Person · ${SEED_BARCO_USERS.superadmin.documentNumber})`,
    );
    console.log(
      `   • ${SEED_BARCO_USERS.admin.userName} / ${password}  (ADMIN dueño ambas · ${SEED_BARCO_USERS.admin.documentNumber})`,
    );
    console.log(
      `   • operador / ${password}  (POS_OPERATOR ambas · ${SEED_BARCO_USERS.operador.documentNumber})`,
    );
    console.log(
      `   • mesero / ${password}  (WAITER Ohlala · ${SEED_BARCO_USERS.mesero.documentNumber})`,
    );
  } finally {
    await app.close();
  }
}

bootstrap().catch((err) => {
  console.error('❌ Seed Barco falló', err);
  process.exit(1);
});
