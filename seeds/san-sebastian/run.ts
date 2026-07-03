#!/usr/bin/env ts-node
/** Seed Supermercado San Sebastián — `npm run seed:san-sebastian`. */

import * as path from 'path';
import { NestFactory } from '@nestjs/core';
import { DataSource, Repository } from 'typeorm';
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
import { Shareholder } from '@modules/shareholders/domain/shareholder.entity';
import { Customer } from '@modules/customers/domain/customer.entity';
import { Product } from '@modules/products/domain/product.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { PriceListItem } from '@modules/price-list-items/domain/price-list-item.entity';
import {
  Storage,
  StorageCategory,
  StorageType,
} from '@modules/storages/domain/storage.entity';
import { TenantContext } from '@common/tenant/tenant.context';
import { AppConfigService } from '../../backend/src/config/config.service';
import { cleanBackendPublicFolder } from '../shared/seed-multimedia.util';
import { assertValidChileCompanyRut } from '@shared/utils/chile-company-rut.util';
import type { CompanyPaymentMethodConfig } from '@modules/payment-methods-config/domain/payment-method-config.types';
import { runSeedBootstrapGuards } from '../shared/seed-bootstrap.util';
import { syncSeedCategories } from '../shared/seed-catalog.util';
import {
  SEED_BRANCH_ADDRESS,
  SEED_BRANCH_LOCATION,
  SEED_BRANCH_NAME,
  SEED_BRANCH_PHONE,
  SEED_CASH_HUB_CODE,
  SEED_CASH_HUB_NAME,
  SEED_POS_NAME,
  SEED_PRESALE_POS_NAME,
  SEED_PRICE_LIST_NAME,
  SEED_SAN_SEBASTIAN_COMPANY,
  SEED_SAN_SEBASTIAN_SHAREHOLDER,
  SEED_STORAGE_CODE,
  SEED_STORAGE_NAME,
  buildSeedCompanyBankAccounts,
  buildSeedCompanyPaymentCatalog,
  buildSeedPosPaymentList,
  buildSeedSanSebastianCompanySettings,
  getSeedSanSebastianSiiEmisorFields,
  SEED_ADMIN_EMAIL,
  SEED_ADMIN_USERNAME,
  SEED_OPERATOR_EMAIL,
  SEED_OPERATOR_USERNAME,
} from './seed-san-sebastian-config';
import {
  loadSanSebastianCatalogJson,
  loadSanSebastianCategoriesJson,
  seedSanSebastianCatalogBulk,
} from './seed-san-sebastian-catalog';
import { seedSanSebastianFiscal } from './seed-san-sebastian-fiscal';

const SEED_IVA_DESCRIPTION =
  'Impuesto al Valor Agregado sobre ventas, servicios e importaciones.';

const SEED_UNIT_BASE_NAME = 'Unidad';
const SEED_UNIT_BASE_SYMBOL = 'un';

const SEED_DEMO_CUSTOMERS = [
  {
    person: {
      firstName: 'Cliente',
      lastName: 'Fiado Demo',
      documentType: DocumentType.RUN,
      documentNumber: '15.123.456-7',
      phone: '+56911112222',
    },
    customer: {
      creditLimit: 500_000,
      paymentDayOfMonth: 15 as const,
      isActive: true,
      notes: 'Cliente demo para crédito interno.',
    },
  },
] as const;

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(MinimalSeedModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const dataSource = app.get(DataSource);
    const configService = app.get(AppConfigService);

    if (configService.storage.strategy !== 'local') {
      console.log(
        '⚠️  STORAGE_STRATEGY≠local — se omite limpieza de public/.',
      );
    } else {
      await cleanBackendPublicFolder(configService.storage.local.path);
      console.log(
        `✅ Carpeta public del backend limpiada (${path.dirname(path.resolve(configService.storage.local.path))})`,
      );
    }

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
    const shareholderRepo = dataSource.getRepository(Shareholder);
    const customerRepo = dataSource.getRepository(Customer);
    const userRepo = dataSource.getRepository(User);

    const userName = process.env.SEED_ADMIN_USERNAME || SEED_ADMIN_USERNAME;
    const password = process.env.SEED_ADMIN_PASSWORD || '098098';
    const email = process.env.SEED_ADMIN_EMAIL || SEED_ADMIN_EMAIL;
    const rut = process.env.SEED_COMPANY_RUT || SEED_SAN_SEBASTIAN_COMPANY.rut;

    assertValidChileCompanyRut(rut, 'SEED_COMPANY_RUT');

    const categoriesJson = loadSanSebastianCategoriesJson();
    const catalogJson = loadSanSebastianCatalogJson();
    const siiEmisor = getSeedSanSebastianSiiEmisorFields();

    let company = await companyRepo.findOne({
      where: { rut, deletedAt: null as never },
    });
    if (!company) {
      company = companyRepo.create({
        razonSocial: SEED_SAN_SEBASTIAN_COMPANY.razonSocial,
        nombreFantasia: SEED_SAN_SEBASTIAN_COMPANY.nombreFantasia,
        businessActivity: SEED_SAN_SEBASTIAN_COMPANY.businessActivity,
        rut,
        address: SEED_SAN_SEBASTIAN_COMPANY.address,
        mail: SEED_SAN_SEBASTIAN_COMPANY.mail,
        phone: SEED_SAN_SEBASTIAN_COMPANY.phone,
        defaultCurrency: SEED_SAN_SEBASTIAN_COMPANY.defaultCurrency,
        commune: siiEmisor.commune,
        city: siiEmisor.city,
        siiResolutionNumber: siiEmisor.siiResolutionNumber,
        siiResolutionDate: siiEmisor.siiResolutionDate,
        isActive: true,
      });
      await companyRepo.save(company);
      console.log(`✅ Empresa creada: id=${company.id} rut='${rut}'`);
    } else {
      company.razonSocial = SEED_SAN_SEBASTIAN_COMPANY.razonSocial;
      company.nombreFantasia = SEED_SAN_SEBASTIAN_COMPANY.nombreFantasia;
      company.businessActivity = SEED_SAN_SEBASTIAN_COMPANY.businessActivity;
      company.address = SEED_SAN_SEBASTIAN_COMPANY.address;
      company.mail = SEED_SAN_SEBASTIAN_COMPANY.mail;
      company.phone = SEED_SAN_SEBASTIAN_COMPANY.phone;
      company.commune = siiEmisor.commune;
      company.city = siiEmisor.city;
      company.siiResolutionNumber = siiEmisor.siiResolutionNumber;
      company.siiResolutionDate = siiEmisor.siiResolutionDate;
      await companyRepo.save(company);
      console.log(`✅ Empresa actualizada: id=${company.id} rut='${rut}'`);
    }

    company.bankAccounts = buildSeedCompanyBankAccounts(company.razonSocial);
    const seedCompanyPaymentCatalog = buildSeedCompanyPaymentCatalog();
    company.settings = buildSeedSanSebastianCompanySettings(
      company.settings as Record<string, unknown> | undefined,
      seedCompanyPaymentCatalog,
    );
    await companyRepo.save(company);
    console.log(
      '✅ Settings: preventa ON, crédito interno ON, eShop OFF, medios CASH/TARJETAS/TRANSFER/CRÉDITO',
    );

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
            description: SEED_IVA_DESCRIPTION,
            isDefault: false,
            isActive: true,
            nonDeletable: true,
          });
          await taxRepo.save(ivaTax);
        }

        let seedBranch = await branchRepo.findOne({
          where: { companyId: company!.id, name: SEED_BRANCH_NAME },
          withDeleted: true,
        });
        if (!seedBranch) {
          seedBranch = branchRepo.create({
            companyId: company!.id,
            name: SEED_BRANCH_NAME,
            address: SEED_BRANCH_ADDRESS,
            phone: SEED_BRANCH_PHONE,
            location: SEED_BRANCH_LOCATION,
            isActive: true,
            isHeadquarters: true,
          });
        } else {
          if (seedBranch.deletedAt) seedBranch = await branchRepo.recover(seedBranch);
          seedBranch.address = SEED_BRANCH_ADDRESS;
          seedBranch.phone = SEED_BRANCH_PHONE;
          seedBranch.location = SEED_BRANCH_LOCATION;
          seedBranch.isActive = true;
          seedBranch.isHeadquarters = true;
        }
        await branchRepo.save(seedBranch);
        console.log(`✅ Sucursal: «${SEED_BRANCH_NAME}» id=${seedBranch.id}`);

        const storageRepo = dataSource.getRepository(Storage);
        let seedStorage = await storageRepo.findOne({
          where: { companyId: company!.id, code: SEED_STORAGE_CODE },
          withDeleted: true,
        });
        if (!seedStorage) {
          seedStorage = storageRepo.create({
            companyId: company!.id,
            name: SEED_STORAGE_NAME,
            code: SEED_STORAGE_CODE,
            branchId: seedBranch.id,
            type: StorageType.STORE,
            category: StorageCategory.IN_BRANCH,
            isDefault: true,
            isActive: true,
          });
        } else {
          if (seedStorage.deletedAt) {
            seedStorage = await storageRepo.recover(seedStorage);
          }
          seedStorage.name = SEED_STORAGE_NAME;
          seedStorage.branchId = seedBranch.id;
          seedStorage.isDefault = true;
          seedStorage.isActive = true;
        }
        await storageRepo.save(seedStorage);

        let baseUnit = await unitRepo.findOne({
          where: {
            symbol: SEED_UNIT_BASE_SYMBOL,
            companyId: company!.id,
            deletedAt: null as never,
          },
        });
        if (!baseUnit) {
          baseUnit = unitRepo.create({
            name: SEED_UNIT_BASE_NAME,
            symbol: SEED_UNIT_BASE_SYMBOL,
            dimension: UnitDimension.COUNT,
            conversionFactor: 1,
            allowDecimals: false,
            isBase: true,
            baseUnitId: null,
            active: true,
            isDefault: true,
          });
        } else {
          baseUnit.name = SEED_UNIT_BASE_NAME;
          baseUnit.active = true;
          baseUnit.isDefault = true;
        }
        await unitRepo.save(baseUnit);

        const categoryByName = await syncSeedCategories(
          categoryRepo,
          categoriesJson,
          'Seed San Sebastián',
        );

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
        } else {
          priceList.isDefault = true;
          priceList.isActive = true;
        }
        await priceListRepo.save(priceList);

        const productRepo = dataSource.getRepository(Product);
        const variantRepo = dataSource.getRepository(ProductVariant);
        const priceListItemRepo = dataSource.getRepository(PriceListItem);

        const { productCount, variantCount } = await seedSanSebastianCatalogBulk({
          companyId: company!.id,
          dataSource,
          productRepo,
          variantRepo,
          priceListItemRepo,
          categoryByName,
          unitId: baseUnit.id,
          priceListId: priceList.id,
          ivaTaxId: ivaTax.id,
          catalog: catalogJson,
        });

        const companyCatalog = (
          company!.settings as { paymentMethods?: CompanyPaymentMethodConfig[] }
        ).paymentMethods ?? seedCompanyPaymentCatalog;
        const posPaymentList = buildSeedPosPaymentList(companyCatalog);
        const priceListsJson = [{ id: priceList.id, name: priceList.name, isDefault: true }];

        let posRow = await posRepo.findOne({
          where: { companyId: company!.id, name: SEED_POS_NAME },
        });
        const posPayload = {
          companyId: company!.id,
          name: SEED_POS_NAME,
          branchId: seedBranch.id,
          storageId: seedStorage.id,
          isActive: true,
          defaultPriceListId: priceList.id,
          priceLists: priceListsJson,
          settings: {
            paymentMethods: posPaymentList,
            kind: 'SALE' as const,
            acceptsPresaleTickets: true,
          },
        };
        if (!posRow) {
          posRow = await posRepo.save(posRepo.create(posPayload));
        } else {
          posRow = await posRepo.save({ ...posRow, ...posPayload });
        }
        console.log(`✅ POS: «${SEED_POS_NAME}» id=${posRow.id}`);

        let presalePos = await posRepo.findOne({
          where: { companyId: company!.id, name: SEED_PRESALE_POS_NAME },
        });
        const presalePayload = {
          companyId: company!.id,
          name: SEED_PRESALE_POS_NAME,
          branchId: seedBranch.id,
          storageId: seedStorage.id,
          isActive: true,
          defaultPriceListId: priceList.id,
          priceLists: priceListsJson,
          settings: {
            paymentMethods: posPaymentList,
            kind: 'PRESALE' as const,
            acceptsPresaleTickets: false,
          },
        };
        if (!presalePos) {
          presalePos = await posRepo.save(posRepo.create(presalePayload));
        } else {
          presalePos = await posRepo.save({ ...presalePos, ...presalePayload });
        }
        console.log(`✅ Preventa: «${SEED_PRESALE_POS_NAME}» id=${presalePos.id}`);

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
        const seedBranchRow = await branchRepo.findOne({ where: { id: seedBranch.id } });
        if (seedBranchRow) cashHub.branches = [seedBranchRow];
        cashHub.pointsOfSale = [posRow];
        await cashHubRepo.save(cashHub);
        posRow.defaultCashHubId = cashHub.id;
        await posRepo.save(posRow);

        await seedSanSebastianFiscal({
          app,
          companyId: company!.id,
          posId: posRow.id,
          posRepo,
        });

        const sh = SEED_SAN_SEBASTIAN_SHAREHOLDER;
        let shPerson = await personRepo.findOne({
          where: { documentNumber: sh.documentNumber, deletedAt: null as never },
        });
        if (!shPerson) {
          shPerson = personRepo.create({
            type: PersonType.NATURAL,
            firstName: sh.firstName,
            lastName: sh.lastName,
            documentType: sh.documentType,
            documentNumber: sh.documentNumber,
          });
        } else {
          shPerson.firstName = sh.firstName;
          shPerson.lastName = sh.lastName;
        }
        shPerson = await personRepo.save(shPerson);

        let shareholder = await shareholderRepo.findOne({
          where: { companyId: company!.id, personId: shPerson.id },
        });
        if (!shareholder) {
          shareholder = shareholderRepo.create({
            companyId: company!.id,
            personId: shPerson.id,
            ownershipPercentage: sh.ownershipPercentage,
            partnerType: sh.partnerType,
            joinDate: sh.joinDate,
            notes: sh.notes,
            isActive: true,
          });
        } else {
          shareholder.ownershipPercentage = sh.ownershipPercentage;
          shareholder.partnerType = sh.partnerType;
          shareholder.joinDate = sh.joinDate;
          shareholder.notes = sh.notes;
          shareholder.isActive = true;
        }
        await shareholderRepo.save(shareholder);
        console.log(`✅ Socia: ${sh.firstName} ${sh.lastName} (${sh.documentNumber})`);

        for (const item of SEED_DEMO_CUSTOMERS) {
          let person = await personRepo.findOne({
            where: { documentNumber: item.person.documentNumber, deletedAt: null as never },
          });
          if (!person) {
            person = personRepo.create({
              type: PersonType.NATURAL,
              firstName: item.person.firstName,
              lastName: item.person.lastName,
              documentType: item.person.documentType,
              documentNumber: item.person.documentNumber,
              phone: item.person.phone,
            });
          }
          person = await personRepo.save(person);

          let customer = await customerRepo.findOne({
            where: { companyId: company!.id, personId: person.id },
            withDeleted: true,
          });
          if (!customer) {
            customer = customerRepo.create({
              companyId: company!.id,
              personId: person.id,
              creditLimit: item.customer.creditLimit,
              currentBalance: 0,
              paymentDayOfMonth: item.customer.paymentDayOfMonth,
              isActive: item.customer.isActive,
              notes: item.customer.notes,
            });
          } else {
            if (customer.deletedAt) customer = await customerRepo.recover(customer);
            customer.creditLimit = item.customer.creditLimit;
            customer.paymentDayOfMonth = item.customer.paymentDayOfMonth;
            customer.isActive = item.customer.isActive;
            customer.notes = item.customer.notes;
          }
          await customerRepo.save(customer);
        }
        console.log(`✅ Cliente demo con crédito interno (${SEED_DEMO_CUSTOMERS.length})`);

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
            const savedPerson = await personRepo.save(
              personRepo.create({
                type: PersonType.NATURAL,
                firstName: params.firstName,
                lastName: params.lastName,
                documentType: DocumentType.RUT,
                documentNumber: params.documentNumber,
                email: params.email,
              }),
            );
            u = await userRepo.save(
              userRepo.create({
                userName: params.userName,
                pass: await bcrypt.hash(params.password, 12),
                mail: params.email,
                rol: params.rol,
                companyId: params.companyId,
                nonDeletable: params.nonDeletable,
                person: savedPerson,
              }),
            );
          } else {
            u.pass = u.pass?.startsWith('$2')
              ? u.pass
              : await bcrypt.hash(params.password, 12);
            u.mail = params.email;
            u.rol = params.rol;
            u.companyId = params.companyId;
            u.nonDeletable = params.nonDeletable;
            await userRepo.save(u);
          }
        };

        await ensureSeedUser({
          userName,
          password,
          rol: UserRole.ADMIN,
          companyId: company!.id,
          nonDeletable: false,
          firstName: 'Admin',
          lastName: 'San Sebastián',
          email,
          documentNumber: '22.222.222-2',
        });
        await ensureSeedUser({
          userName: SEED_OPERATOR_USERNAME,
          password,
          rol: UserRole.OPERATOR,
          companyId: company!.id,
          nonDeletable: false,
          firstName: 'Operador',
          lastName: 'San Sebastián',
          email: SEED_OPERATOR_EMAIL,
          documentNumber: '33.333.333-3',
        });

        console.log('✅ Seed San Sebastián OK');
        console.log(`   • companyId=${company!.id}`);
        console.log(`   • NEXT_PUBLIC_COMPANY_ID=${company!.id}`);
        console.log(`   • ${userName} / ${password} (ADMIN)`);
        console.log(`   • ${SEED_OPERATOR_USERNAME} / ${password} (OPERATOR)`);
        console.log(`   • Catálogo: ${productCount} productos, ${variantCount} variantes`);
        console.log(
          `   • Preventa: «${SEED_PRESALE_POS_NAME}» | Caja acepta tickets | Crédito interno: habilitado`,
        );
        console.log('   • SII: producción habilitada, boleta en POS');
      },
    );
  } catch (error) {
    console.error('❌ Error ejecutando seed San Sebastián:', error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

bootstrap();
