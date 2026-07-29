#!/usr/bin/env ts-node
/**
 * Aplica solo catálogo lavandería + servicios SERVICE (sin reseedar todo).
 * Uso: npm run seed:demo:laundry --prefix seeds
 */
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { SeedOperationalModule } from '../shared/seed-operational.module';
import { TenantContext } from '@common/tenant/tenant.context';
import { Company } from '@modules/companies/domain/company.entity';
import { Category } from '@modules/categories/domain/category.entity';
import { Brand } from '@modules/brands/domain/brand.entity';
import { Attribute } from '@modules/attributes/domain/attribute.entity';
import { Unit } from '@modules/units/domain/unit.entity';
import { Tax, TaxType } from '@modules/taxes/domain/tax.entity';
import { Product } from '@modules/products/domain/product.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { PriceList, PriceListType } from '@modules/price-lists/domain/price-list.entity';
import { PriceListItem } from '@modules/price-list-items/domain/price-list-item.entity';
import { ProductType } from '@modules/products/domain/product.entity';
import {
  seedProductsFromDefinitions,
  syncSeedBrands,
} from '../shared/seed-catalog.util';
import { SEED_DEV_COMPANY, SEED_PRICE_LIST_RETAIL_NAME } from './config';
import { SEED_DEV_PRODUCTS, type SeedDevProductSeed } from './catalog';
import { seedDemoLaundryCatalog } from './seed-demo-laundry-catalog';

const LAUNDRY_PRODUCTS: SeedDevProductSeed[] = SEED_DEV_PRODUCTS.filter(
  (p) => p.categoryName === 'Lavandería' && p.productType === ProductType.SERVICE,
);

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(SeedOperationalModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const dataSource = app.get(DataSource);
    const companyRepo = dataSource.getRepository(Company);
    const company = await companyRepo.findOne({
      where: { rut: SEED_DEV_COMPANY.rut },
    });
    if (!company) {
      throw new Error(
        `Empresa demo no encontrada (${SEED_DEV_COMPANY.rut}). Ejecutá seed:demo primero.`,
      );
    }

    await TenantContext.run(
      { activeCompanyId: company.id, userId: null, rol: null },
      async () => {
      const categoryRepo = dataSource.getRepository(Category);
      let laundryCat = await categoryRepo.findOne({
        where: { companyId: company.id, name: 'Lavandería' },
      });
      if (!laundryCat) {
        laundryCat = await categoryRepo.save(
          categoryRepo.create({
            companyId: company.id,
            name: 'Lavandería',
            sortOrder: 99,
            isActive: true,
            resultCenterId: null,
          }),
        );
        console.log(`✅ Categoría Lavandería creada: id=${laundryCat.id}`);
      } else {
        laundryCat.isActive = true;
        laundryCat = await categoryRepo.save(laundryCat);
        console.log(`✅ Categoría Lavandería sincronizada: id=${laundryCat.id}`);
      }

      await seedDemoLaundryCatalog(dataSource, company.id);

      const taxRepo = dataSource.getRepository(Tax);
      const ivaTax = await taxRepo.findOne({
        where: { companyId: company.id, taxType: TaxType.IVA },
      });
      if (!ivaTax) {
        throw new Error('IVA no encontrado para la empresa demo.');
      }

      const unitRepo = dataSource.getRepository(Unit);
      const unitUn =
        (await unitRepo.findOne({
          where: { companyId: company.id, symbol: 'un' },
        })) ??
        (await unitRepo.findOne({
          where: { companyId: company.id, symbol: 'UN' },
        })) ??
        (await unitRepo.findOne({
          where: { companyId: company.id, isDefault: true },
        }));
      if (!unitUn) {
        throw new Error('Unidad base (un) no encontrada.');
      }

      const priceListRepo = dataSource.getRepository(PriceList);
      const listaMinorista = await priceListRepo.findOne({
        where: { companyId: company.id, name: SEED_PRICE_LIST_RETAIL_NAME },
      });
      const listaVip =
        (await priceListRepo.findOne({
          where: { companyId: company.id, priceListType: PriceListType.VIP },
        })) ?? listaMinorista;
      const listaEshop =
        (await priceListRepo.findOne({
          where: { companyId: company.id, name: 'eShop' },
        })) ?? listaMinorista;
      if (!listaMinorista) {
        throw new Error(`Lista «${SEED_PRICE_LIST_RETAIL_NAME}» no encontrada.`);
      }

      const brandIdByName = await syncSeedBrands(
        dataSource.getRepository(Brand),
        company.id,
        ['DemoBrand'],
        'Seed laundry',
      );

      const categoryByName = new Map<string, Category>([['Lavandería', laundryCat]]);
      const attributesByName = new Map<string, Attribute>();

      const { variantCount } = await seedProductsFromDefinitions(LAUNDRY_PRODUCTS, {
        companyId: company.id,
        productRepo: dataSource.getRepository(Product),
        variantRepo: dataSource.getRepository(ProductVariant),
        priceListItemRepo: dataSource.getRepository(PriceListItem),
        ivaTax,
        categoryByName,
        brandIdByName,
        attributesByName,
        seedUnitId: { UN: unitUn.id, ML: unitUn.id, L: unitUn.id, G: unitUn.id, KG: unitUn.id },
        listaMinoristaId: listaMinorista.id,
        listaMayoristaId: listaVip!.id,
        listaEshopId: listaEshop!.id,
        logPrefix: 'Seed laundry',
        defaultStockQty: 0,
      });

      console.log(
        `✅ Servicios lavandería: ${LAUNDRY_PRODUCTS.length} producto(s), ${variantCount} variante(s)`,
      );
    });
  } catch (error) {
    console.error('❌ Error seed lavandería:', error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

void bootstrap();
