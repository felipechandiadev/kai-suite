#!/usr/bin/env ts-node
/**
 * Habilita e-Shop con slug `demo` en la primera empresa activa (o COMPANY_ID en env).
 * Uso: cd kai-core && npx ts-node -r tsconfig-paths/register src/scripts/enable-eshop-demo.ts
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';
import { Company } from '@modules/companies/domain/company.entity';
import { sanitizeCompanyEShopFlatSettings } from '@modules/companies/domain/company-eshop-flat.types';

const DEMO_SLUG = 'demo';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  const ds = app.get(DataSource);
  const repo = ds.getRepository(Company);

  const companyId = process.env.COMPANY_ID?.trim();
  const company = companyId
    ? await repo.findOne({ where: { id: companyId } })
    : await repo.findOne({ where: { isActive: true }, order: { createdAt: 'ASC' } });

  if (!company) {
    console.error('No hay empresa activa.');
    process.exit(1);
  }

  const settings = { ...(company.settings ?? {}) } as Record<string, unknown>;
  const merged = sanitizeCompanyEShopFlatSettings({
    ...settings,
    eShopEnabled: true,
    eShopPublicSlug: DEMO_SLUG,
    eShopFreeShippingThreshold: settings.eShopFreeShippingThreshold ?? 50_000,
    eShopShippingMode: settings.eShopShippingMode ?? 'disabled',
  });

  settings.eShopEnabled = merged.eShopEnabled;
  settings.eShopPublicSlug = merged.eShopPublicSlug;
  settings.eShopFeaturedProductVariantIds = merged.eShopFeaturedProductVariantIds;
  settings.eShopFreeShippingThreshold = merged.eShopFreeShippingThreshold;
  settings.eShopShippingMode = merged.eShopShippingMode;
  settings.eShopDefaultBranchId = merged.eShopDefaultBranchId;

  company.settings = settings;
  await repo.save(company);

  console.log(
    `e-Shop habilitado para "${company.nombreFantasia || company.razonSocial}" (${company.id}) → slug "${DEMO_SLUG}"`,
  );
  await app.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
