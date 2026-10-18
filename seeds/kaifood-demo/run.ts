#!/usr/bin/env ts-node
/** Seed mínimo Kai Food Demo — `npm run seed:kaifood-demo` */

import '../shared/ensure-seed-local-storage-path';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { MinimalSeedModule } from '../shared/minimal-seed.module';
import { User, UserRole } from '@modules/users/domain/user.entity';
import { Person, PersonType, DocumentType } from '@modules/persons/domain/person.entity';
import { Company } from '@modules/companies/domain/company.entity';
import { Tax, TaxType } from '@modules/taxes/domain/tax.entity';
import { Branch } from '@modules/branches/domain/branch.entity';
import { Unit } from '@modules/units/domain/unit.entity';
import { UnitDimension } from '@modules/units/domain/unit-dimension.enum';
import { Category } from '@modules/categories/domain/category.entity';
import { Brand } from '@modules/brands/domain/brand.entity';
import { PriceList, PriceListType } from '@modules/price-lists/domain/price-list.entity';
import { PointOfSale } from '@modules/points-of-sale/domain/point-of-sale.entity';
import { CashHub } from '@modules/cash-hubs/domain/cash-hub.entity';
import { Product } from '@modules/products/domain/product.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { PriceListItem } from '@modules/price-list-items/domain/price-list-item.entity';
import { Storage, StorageCategory, StorageType } from '@modules/storages/domain/storage.entity';
import { DiningRoom } from '@modules/dining/domain/dining-room.entity';
import { DiningTable } from '@modules/dining/domain/dining-table.entity';
import { DiningBranchSettings } from '@modules/dining/domain/dining-branch-settings.entity';
import { TableShape } from '@modules/dining/domain/dining.enums';
import { TenantContext } from '@common/tenant/tenant.context';
import { assertValidChileCompanyRut } from '@shared/utils/chile-company-rut.util';
import { runSeedBootstrapGuards } from '../shared/seed-bootstrap.util';
import {
  seedProductsFromDefinitions,
  syncSeedBrands,
  syncSeedCategories,
} from '../shared/seed-catalog.util';
import type { SeedUnitKey } from '../shared/seed-catalog.types';
import {
  SEED_BRANCH_NAME,
  SEED_CASH_HUB_CODE,
  SEED_CASH_HUB_NAME,
  SEED_CATEGORIES,
  SEED_COMPANY,
  SEED_PASSWORD,
  SEED_POS_NAME,
  SEED_PRICE_LIST_NAME,
  SEED_PRODUCTS,
  SEED_STORAGE_CODE,
  SEED_STORAGE_NAME,
  buildSeedCompanyBankAccounts,
  buildSeedCompanyPaymentCatalog,
  buildSeedCompanySettings,
  buildSeedPosPaymentList,
  SEED_BRAND_NAME,
} from './config';

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
    const brandRepo = dataSource.getRepository(Brand);
    const priceListRepo = dataSource.getRepository(PriceList);
    const posRepo = dataSource.getRepository(PointOfSale);
    const cashHubRepo = dataSource.getRepository(CashHub);
    const userRepo = dataSource.getRepository(User);
    const productRepo = dataSource.getRepository(Product);
    const variantRepo = dataSource.getRepository(ProductVariant);
    const priceListItemRepo = dataSource.getRepository(PriceListItem);
    const storageRepo = dataSource.getRepository(Storage);
    const diningRoomRepo = dataSource.getRepository(DiningRoom);
    const diningTableRepo = dataSource.getRepository(DiningTable);
    const diningSettingsRepo = dataSource.getRepository(DiningBranchSettings);

    const rut = process.env.SEED_COMPANY_RUT || SEED_COMPANY.rut;
    assertValidChileCompanyRut(rut, 'SEED_COMPANY_RUT');

    let company = await companyRepo.findOne({ where: { rut, deletedAt: null as never } });
    if (!company) {
      company = companyRepo.create({
        razonSocial: SEED_COMPANY.razonSocial,
        nombreFantasia: SEED_COMPANY.nombreFantasia,
        businessActivity: SEED_COMPANY.businessActivity,
        rut,
        address: SEED_COMPANY.address,
        mail: SEED_COMPANY.mail,
        phone: SEED_COMPANY.phone,
        defaultCurrency: SEED_COMPANY.defaultCurrency,
        isActive: true,
      });
    } else {
      company.razonSocial = SEED_COMPANY.razonSocial;
      company.nombreFantasia = SEED_COMPANY.nombreFantasia;
      company.businessActivity = SEED_COMPANY.businessActivity;
      company.address = SEED_COMPANY.address;
      company.mail = SEED_COMPANY.mail;
      company.phone = SEED_COMPANY.phone;
    }
    await companyRepo.save(company);
    console.log(`✅ Empresa: ${company.nombreFantasia} (${rut})`);

    const paymentCatalog = buildSeedCompanyPaymentCatalog();
    company.bankAccounts = buildSeedCompanyBankAccounts(company.razonSocial);

    await TenantContext.run(
      { activeCompanyId: company.id, userId: null, rol: null },
      async () => {
        let ivaTax = await taxRepo.findOne({
          where: { companyId: company!.id, name: 'IVA', taxType: TaxType.IVA },
        });
        if (!ivaTax) {
          ivaTax = taxRepo.create({
            companyId: company!.id,
            name: 'IVA',
            taxType: TaxType.IVA,
            rate: 19,
            description: 'IVA ventas',
            isDefault: false,
            isActive: true,
            nonDeletable: true,
          });
          await taxRepo.save(ivaTax);
        }

        let branch = await branchRepo.findOne({
          where: { companyId: company!.id, name: SEED_BRANCH_NAME },
          withDeleted: true,
        });
        if (!branch) {
          branch = branchRepo.create({
            companyId: company!.id,
            name: SEED_BRANCH_NAME,
            address: SEED_COMPANY.address,
            phone: SEED_COMPANY.phone,
            isActive: true,
            isHeadquarters: true,
          });
        } else {
          if (branch.deletedAt) branch = await branchRepo.recover(branch);
          branch.isActive = true;
          branch.isHeadquarters = true;
        }
        await branchRepo.save(branch);

        let storage = await storageRepo.findOne({
          where: { companyId: company!.id, code: SEED_STORAGE_CODE },
          withDeleted: true,
        });
        if (!storage) {
          storage = storageRepo.create({
            companyId: company!.id,
            name: SEED_STORAGE_NAME,
            code: SEED_STORAGE_CODE,
            branchId: branch.id,
            type: StorageType.STORE,
            category: StorageCategory.IN_BRANCH,
            isDefault: true,
            isActive: true,
          });
        } else {
          if (storage.deletedAt) storage = await storageRepo.recover(storage);
          storage.branchId = branch.id;
          storage.isDefault = true;
        }
        await storageRepo.save(storage);

        let baseUnit = await unitRepo.findOne({
          where: { companyId: company!.id, symbol: 'un', deletedAt: null as never },
        });
        if (!baseUnit) {
          baseUnit = unitRepo.create({
            companyId: company!.id,
            name: 'Unidad',
            symbol: 'un',
            dimension: UnitDimension.COUNT,
            conversionFactor: 1,
            allowDecimals: false,
            isBase: true,
            baseUnitId: null,
            active: true,
            isDefault: true,
          });
          await unitRepo.save(baseUnit);
        }

        const categoryByName = await syncSeedCategories(
          categoryRepo,
          company!.id,
          SEED_CATEGORIES,
          'KaiFoodDemo',
        );
        const brandIdByName = await syncSeedBrands(
          brandRepo,
          company!.id,
          [SEED_BRAND_NAME],
          'KaiFoodDemo',
        );
        const seedUnitId = {
          UN: baseUnit.id,
          ML: baseUnit.id,
          L: baseUnit.id,
          G: baseUnit.id,
          KG: baseUnit.id,
        } satisfies Record<SeedUnitKey, string>;

        let priceList = await priceListRepo.findOne({
          where: { companyId: company!.id, name: SEED_PRICE_LIST_NAME },
        });
        if (!priceList) {
          priceList = priceListRepo.create({
            companyId: company!.id,
            name: SEED_PRICE_LIST_NAME,
            priceListType: PriceListType.RETAIL,
            currency: 'CLP',
            priority: 0,
            isDefault: true,
            isActive: true,
          });
        }
        await priceListRepo.save(priceList);

        const { variantCount } = await seedProductsFromDefinitions(SEED_PRODUCTS, {
          companyId: company!.id,
          productRepo,
          variantRepo,
          priceListItemRepo,
          ivaTax,
          categoryByName,
          brandIdByName,
          attributesByName: new Map(),
          seedUnitId,
          listaMinoristaId: priceList.id,
          listaMayoristaId: priceList.id,
          listaEshopId: priceList.id,
          logPrefix: 'KaiFoodDemo',
        });
        console.log(`✅ Catálogo: ${SEED_PRODUCTS.length} productos, ${variantCount} variantes`);

        const posPayments = buildSeedPosPaymentList(paymentCatalog);
        const priceListsJson = [{ id: priceList.id, name: priceList.name, isDefault: true }];
        let pos = await posRepo.findOne({
          where: { companyId: company!.id, name: SEED_POS_NAME },
        });
        const posPayload = {
          companyId: company!.id,
          name: SEED_POS_NAME,
          branchId: branch.id,
          storageId: storage.id,
          isActive: true,
          defaultPriceListId: priceList.id,
          priceLists: priceListsJson,
          settings: { paymentMethods: posPayments, kind: 'SALE' as const },
        };
        pos = pos ? await posRepo.save({ ...pos, ...posPayload }) : await posRepo.save(posRepo.create(posPayload));

        let cashHub = await cashHubRepo.findOne({
          where: { companyId: company!.id, code: SEED_CASH_HUB_CODE },
        });
        if (!cashHub) {
          cashHub = cashHubRepo.create({
            companyId: company!.id,
            name: SEED_CASH_HUB_NAME,
            code: SEED_CASH_HUB_CODE,
            isActive: true,
          });
          await cashHubRepo.save(cashHub);
        }
        const branchRow = await branchRepo.findOne({ where: { id: branch.id } });
        if (branchRow) cashHub.branches = [branchRow];
        cashHub.pointsOfSale = [pos];
        await cashHubRepo.save(cashHub);
        pos.defaultCashHubId = cashHub.id;
        await posRepo.save(pos);

        let room = await diningRoomRepo.findOne({
          where: { companyId: company!.id, branchId: branch.id, name: 'Salón' },
        });
        if (!room) {
          room = diningRoomRepo.create({
            companyId: company!.id,
            branchId: branch.id,
            name: 'Salón',
            isActive: true,
          });
        }
        room = await diningRoomRepo.save(room);
        for (const code of ['M1', 'M2', 'M3']) {
          let table = await diningTableRepo.findOne({ where: { diningRoomId: room.id, code } });
          if (!table) {
            table = diningTableRepo.create({
              diningRoomId: room.id,
              code,
              label: `Mesa ${code.slice(1)}`,
              capacity: 4,
              shape: TableShape.RECT,
            });
            await diningTableRepo.save(table);
          }
        }

        let diningSettings = await diningSettingsRepo.findOne({
          where: { companyId: company!.id, branchId: branch.id },
        });
        if (!diningSettings) {
          diningSettings = diningSettingsRepo.create({
            companyId: company!.id,
            branchId: branch.id,
            allowPosOpenTable: true,
          });
        } else {
          diningSettings.allowPosOpenTable = true;
        }
        await diningSettingsRepo.save(diningSettings);

        company!.settings = buildSeedCompanySettings({
          existing: company!.settings as Record<string, unknown> | undefined,
          paymentMethods: paymentCatalog,
          menuDefaultBranchId: branch.id,
          menuDefaultPriceListId: priceList.id,
        });
        await companyRepo.save(company!);

        const adminUser = process.env.SEED_ADMIN_USERNAME || 'admin';
        const adminMail = process.env.SEED_ADMIN_EMAIL || 'admin@kaifood-demo.local';
        let user = await userRepo.findOne({
          where: { userName: adminUser, deletedAt: null as never },
          relations: ['person'],
        });
        if (!user) {
          const person = await personRepo.save(
            personRepo.create({
              type: PersonType.NATURAL,
              firstName: 'Admin',
              lastName: 'Demo',
              documentType: DocumentType.RUT,
              documentNumber: '11.111.111-1',
              email: adminMail,
            }),
          );
          user = await userRepo.save(
            userRepo.create({
              userName: adminUser,
              pass: await bcrypt.hash(SEED_PASSWORD, 12),
              mail: adminMail,
              rol: UserRole.ADMIN,
              companyId: company!.id,
              nonDeletable: true,
              person,
            }),
          );
        }
        console.log(`✅ Usuario: ${adminUser} / ${SEED_PASSWORD}`);
        console.log(`✅ Carta pública slug=${SEED_COMPANY.menuPublicSlug}`);
      },
    );
  } finally {
    await app.close();
  }
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
