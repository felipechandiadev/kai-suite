#!/usr/bin/env ts-node
/** Seed Barco — catálogo desde export PDV (`npm run seed:barco`). */

import '../shared/ensure-seed-local-storage-path';
import { NestFactory } from '@nestjs/core';
import { DataSource, IsNull } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { MinimalSeedModule } from '../shared/minimal-seed.module';
import { User, UserRole } from '@modules/users/domain/user.entity';
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
import { assertValidChileCompanyRut } from '@shared/utils/chile-company-rut.util';
import { Brand } from '@modules/brands/domain/brand.entity';
import { Product } from '@modules/products/domain/product.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { PriceListItem } from '@modules/price-list-items/domain/price-list-item.entity';
import {
  Storage,
  StorageCategory,
  StorageType,
} from '@modules/storages/domain/storage.entity';
import { StockLevel } from '@modules/stock-levels/domain/stock-level.entity';
import { TenantContext } from '@common/tenant/tenant.context';
import { runSeedBootstrapGuards } from '../shared/seed-bootstrap.util';
import {
  seedProductsFromDefinitions,
  syncSeedBrands,
  syncSeedCategories,
} from '../shared/seed-catalog.util';
import type { SeedUnitKey } from '../shared/seed-catalog.types';
import {
  SEED_BARCO_COMPANY,
  SEED_BRANCH_ADDRESS,
  SEED_BRANCH_LOCATION,
  SEED_BRANCH_NAME,
  SEED_BRANCH_PHONE,
  SEED_BRAND_NAME,
  SEED_CASH_HUB_CODE,
  SEED_CASH_HUB_NAME,
  SEED_POS_NAME,
  SEED_PRICE_LIST_RETAIL_NAME,
  SEED_STORAGE_CODE,
  SEED_STORAGE_NAME,
  SEED_UNIT_BASE_NAME,
  SEED_UNIT_BASE_SYMBOL,
  buildSeedCompanyBankAccounts,
  buildSeedCompanyPaymentCatalog,
  buildSeedCompanySettings,
  buildSeedPosPaymentList,
} from './config';
import {
  barcoInitialStockBySku,
  loadBarcoCatalog,
  mapBarcoCatalogToSeedProducts,
} from './load-catalog';

const SEED_IVA_DESCRIPTION =
  'Impuesto al Valor Agregado sobre ventas, servicios e importaciones.';

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
    const userRepo = dataSource.getRepository(User);
    const productRepo = dataSource.getRepository(Product);
    const brandRepo = dataSource.getRepository(Brand);
    const variantRepo = dataSource.getRepository(ProductVariant);
    const priceListItemRepo = dataSource.getRepository(PriceListItem);
    const storageRepo = dataSource.getRepository(Storage);
    const stockLevelRepo = dataSource.getRepository(StockLevel);

    const userName = process.env.SEED_ADMIN_USERNAME || 'admin';
    const password = process.env.SEED_ADMIN_PASSWORD || '098098';
    const email = process.env.SEED_ADMIN_EMAIL || 'admin@barco.local';
    const rut = process.env.SEED_COMPANY_RUT || SEED_BARCO_COMPANY.rut;
    assertValidChileCompanyRut(rut, 'SEED_COMPANY_RUT');

    const catalog = loadBarcoCatalog();
    const seedProducts = mapBarcoCatalogToSeedProducts(catalog);
    const stockBySku = barcoInitialStockBySku(catalog);

    let company = await companyRepo.findOne({
      where: { rut, deletedAt: null as never },
    });
    if (!company) {
      company = companyRepo.create({
        razonSocial: SEED_BARCO_COMPANY.razonSocial,
        nombreFantasia: SEED_BARCO_COMPANY.nombreFantasia,
        businessActivity: SEED_BARCO_COMPANY.businessActivity,
        rut,
        address: SEED_BARCO_COMPANY.address,
        mail: SEED_BARCO_COMPANY.mail,
        phone: SEED_BARCO_COMPANY.phone,
        defaultCurrency: SEED_BARCO_COMPANY.defaultCurrency,
        isActive: true,
      });
      await companyRepo.save(company);
      console.log(`✅ Empresa creada: ${company.nombreFantasia} (${company.rut})`);
    } else {
      company.razonSocial = SEED_BARCO_COMPANY.razonSocial;
      company.nombreFantasia = SEED_BARCO_COMPANY.nombreFantasia;
      company.businessActivity = SEED_BARCO_COMPANY.businessActivity;
      company.address = SEED_BARCO_COMPANY.address;
      company.mail = SEED_BARCO_COMPANY.mail;
      company.phone = SEED_BARCO_COMPANY.phone;
      await companyRepo.save(company);
      console.log(`✅ Empresa sincronizada: ${company.id}`);
    }

    company.bankAccounts = buildSeedCompanyBankAccounts(company.razonSocial);
    const paymentCatalog = buildSeedCompanyPaymentCatalog();
    company.settings = buildSeedCompanySettings(
      company.settings as Record<string, unknown> | undefined,
      paymentCatalog,
    );
    await companyRepo.save(company);

    await TenantContext.run(
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
          console.log(`✅ IVA 19% creado: ${ivaTax.id}`);
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
            address: SEED_BRANCH_ADDRESS,
            phone: SEED_BRANCH_PHONE,
            location: SEED_BRANCH_LOCATION,
            isActive: true,
            isHeadquarters: true,
          });
          await branchRepo.save(seedBranch);
          console.log(`✅ Sucursal «${SEED_BRANCH_NAME}» creada`);
        } else {
          if (seedBranch.deletedAt) seedBranch = await branchRepo.recover(seedBranch);
          seedBranch.address = SEED_BRANCH_ADDRESS;
          seedBranch.phone = SEED_BRANCH_PHONE;
          seedBranch.location = SEED_BRANCH_LOCATION;
          seedBranch.isActive = true;
          seedBranch.isHeadquarters = true;
          await branchRepo.save(seedBranch);
        }
        await branchRepo.update({ companyId: company.id }, { isHeadquarters: false });
        seedBranch.isHeadquarters = true;
        await branchRepo.save(seedBranch);

        let seedStorage = await storageRepo.findOne({
          where: { companyId: company.id, code: SEED_STORAGE_CODE },
          withDeleted: true,
        });
        if (!seedStorage) {
          seedStorage = storageRepo.create({
            companyId: company.id,
            name: SEED_STORAGE_NAME,
            code: SEED_STORAGE_CODE,
            branchId: seedBranch.id,
            type: StorageType.STORE,
            category: StorageCategory.IN_BRANCH,
            isDefault: true,
            isActive: true,
          });
          await storageRepo.save(seedStorage);
          console.log(`✅ Almacén «${SEED_STORAGE_NAME}» creado`);
        } else {
          if (seedStorage.deletedAt) seedStorage = await storageRepo.recover(seedStorage);
          seedStorage.name = SEED_STORAGE_NAME;
          seedStorage.branchId = seedBranch.id;
          seedStorage.isDefault = true;
          seedStorage.isActive = true;
          await storageRepo.save(seedStorage);
        }
        await storageRepo.update({ companyId: company.id }, { isDefault: false });
        await storageRepo.update({ id: seedStorage.id }, { isDefault: true });

        const setCompanyDefaultUnit = async (defaultUnitId: string) => {
          await unitRepo.update(
            { companyId: company.id, deletedAt: null as never },
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
            u = unitRepo.create({
              ...args,
              active: true,
              isDefault,
            });
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
        console.log('✅ Unidades seed: un, ml, L, g, kg');

        const categoryByName = await syncSeedCategories(
          categoryRepo,
          company.id,
          catalog.categories,
          'Barco',
          { silent: true },
        );
        const brandIdByName = await syncSeedBrands(
          brandRepo,
          company.id,
          [SEED_BRAND_NAME],
          'Barco',
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
          console.log(`✅ Lista de precios «${SEED_PRICE_LIST_RETAIL_NAME}» creada`);
        } else {
          if (retailList.deletedAt) retailList = await priceListRepo.recover(retailList);
          retailList.isDefault = true;
          retailList.isActive = true;
          retailList.priceListType = PriceListType.RETAIL;
          await priceListRepo.save(retailList);
        }
        await priceListRepo.update({ companyId: company.id }, { isDefault: false });
        await priceListRepo.update({ id: retailList.id }, { isDefault: true });

        const otherLists = await priceListRepo.find({
          where: { companyId: company.id, deletedAt: IsNull() },
        });
        for (const pl of otherLists) {
          if (pl.id === retailList.id) continue;
          await priceListRepo.softRemove(pl);
        }

        console.log(`📦 Sembrando ${seedProducts.length} productos…`);
        const { variantCount } = await seedProductsFromDefinitions(seedProducts, {
          companyId: company.id,
          productRepo,
          variantRepo,
          priceListItemRepo,
          categoryByName,
          brandIdByName,
          attributesByName: new Map(),
          seedUnitId,
          ivaTax,
          listaMinoristaId: retailList.id,
          listaMayoristaId: retailList.id,
          listaEshopId: retailList.id,
          logPrefix: 'Barco',
          defaultStockQty: 0,
          silentProducts: true,
        });
        console.log(`✅ Variantes sembradas: ${variantCount}`);

        const variants = await variantRepo.find({
          where: {
            companyId: company.id,
            trackInventory: true,
            deletedAt: IsNull(),
          },
        });
        let stockRows = 0;
        for (const variant of variants) {
          if (!variant.sku) continue;
          const qty = stockBySku.get(variant.sku) ?? 0;
          let level = await stockLevelRepo.findOne({
            where: {
              companyId: company.id,
              productVariantId: variant.id,
              storageId: seedStorage.id,
            },
          });
          if (!level) {
            level = stockLevelRepo.create({
              companyId: company.id,
              productVariantId: variant.id,
              storageId: seedStorage.id,
              physicalStock: qty,
              committedStock: 0,
              availableStock: qty,
              incomingStock: 0,
            });
          } else {
            level.physicalStock = qty;
            level.committedStock = 0;
            level.availableStock = qty;
            level.incomingStock = 0;
          }
          await stockLevelRepo.save(level);
          stockRows += 1;
        }
        console.log(`✅ Stock inicial en «${SEED_STORAGE_NAME}»: ${stockRows} niveles`);

        const posPayments = buildSeedPosPaymentList(paymentCatalog);
        let pos = await posRepo.findOne({
          where: { companyId: company.id, name: SEED_POS_NAME },
          withDeleted: true,
        });
        const posPayload = {
          companyId: company.id,
          name: SEED_POS_NAME,
          branchId: seedBranch.id,
          storageId: seedStorage.id,
          isActive: true,
          defaultPriceListId: retailList.id,
          priceLists: [
            { id: retailList.id, name: retailList.name, isActive: true },
          ],
          settings: { paymentMethods: posPayments },
        };
        if (!pos) {
          pos = await posRepo.save(posRepo.create(posPayload));
          console.log(`✅ POS «${SEED_POS_NAME}» creado`);
        } else {
          if (pos.deletedAt) pos = await posRepo.recover(pos);
          pos = await posRepo.save({ ...pos, ...posPayload });
        }

        let cashHub = await cashHubRepo.findOne({
          where: { companyId: company.id, code: SEED_CASH_HUB_CODE },
        });
        if (!cashHub) {
          cashHub = cashHubRepo.create({
            companyId: company.id,
            name: SEED_CASH_HUB_NAME,
            code: SEED_CASH_HUB_CODE,
            isActive: true,
          });
          await cashHubRepo.save(cashHub);
          console.log(`✅ Cash hub «${SEED_CASH_HUB_NAME}» creado`);
        } else {
          cashHub.name = SEED_CASH_HUB_NAME;
          cashHub.isActive = true;
          await cashHubRepo.save(cashHub);
        }
        cashHub.branches = [seedBranch];
        cashHub.pointsOfSale = [pos];
        await cashHubRepo.save(cashHub);
        pos.defaultCashHubId = cashHub.id;
        await posRepo.save(pos);

        const ensureSeedUser = async (params: {
          userName: string;
          password: string;
          rol: UserRole;
          companyId: string | null;
          nonDeletable: boolean;
          firstName: string;
          lastName: string;
          email: string;
          documentNumber: string;
        }) => {
          let u = await userRepo.findOne({
            where: { userName: params.userName, deletedAt: null as never },
            relations: ['person'],
          });
          if (!u) {
            const personEntity = personRepo.create({
              type: PersonType.NATURAL,
              firstName: params.firstName,
              lastName: params.lastName,
              documentType: DocumentType.RUT,
              documentNumber: params.documentNumber,
              email: params.email,
            });
            const savedPerson = await personRepo.save(personEntity);
            u = userRepo.create({
              userName: params.userName,
              pass: await bcrypt.hash(params.password, 12),
              mail: params.email,
              rol: params.rol,
              companyId: params.companyId,
              nonDeletable: params.nonDeletable,
              person: savedPerson,
            });
            await userRepo.save(u);
            console.log(`✅ Usuario «${params.userName}» creado (${params.rol})`);
            return;
          }
          u.pass = await bcrypt.hash(params.password, 12);
          u.mail = params.email;
          u.rol = params.rol;
          u.companyId = params.companyId;
          u.nonDeletable = params.nonDeletable;
          if (!u.person) {
            u.person = await personRepo.save(
              personRepo.create({
                type: PersonType.NATURAL,
                firstName: params.firstName,
                lastName: params.lastName,
                documentType: DocumentType.RUT,
                documentNumber: params.documentNumber,
                email: params.email,
              }),
            );
          }
          await userRepo.save(u);
          console.log(`✅ Usuario «${params.userName}» sincronizado`);
        };

        await ensureSeedUser({
          userName: 'superadmin',
          password,
          rol: UserRole.SUPER_ADMIN,
          companyId: null,
          nonDeletable: true,
          firstName: 'Administrador',
          lastName: 'de Sistema',
          email: 'superadmin@kai.local',
          documentNumber: '11.111.111-1',
        });

        await ensureSeedUser({
          userName,
          password,
          rol: UserRole.ADMIN,
          companyId: company.id,
          nonDeletable: false,
          firstName: 'Administrador',
          lastName: 'Barco',
          email,
          documentNumber: '22.222.222-2',
        });

        console.log('✅ Seed Barco OK');
        console.log(`   • ${userName} / ${password}  (ADMIN)`);
        console.log(`   • Empresa: «${SEED_BARCO_COMPANY.nombreFantasia}» (${rut})`);
        console.log(
          `   • ${seedProducts.length} productos · 1 lista «${SEED_PRICE_LIST_RETAIL_NAME}» · 1 sucursal · POS «${SEED_POS_NAME}»`,
        );
        console.log('   • Sin ventas ni compras (solo catálogo + stock inicial)');
      },
    );
  } catch (error) {
    console.error('❌ Error ejecutando seed Barco:', error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

bootstrap();
