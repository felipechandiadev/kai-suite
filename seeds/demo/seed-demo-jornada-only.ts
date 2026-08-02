#!/usr/bin/env ts-node
/**
 * Materializa historial de jornada (instances + assignments) sin reseedar todo.
 * Uso: npm run seed:demo:jornada --prefix seeds
 */
import { NestFactory } from '@nestjs/core';
import { DataSource, In } from 'typeorm';
import { SeedOperationalModule } from '../shared/seed-operational.module';
import { TenantContext } from '@common/tenant/tenant.context';
import { Company } from '@modules/companies/domain/company.entity';
import {
  SEED_DEV_COMPANY,
  SEED_DEV_COMPANY_SECOND,
} from './config';
import { seedDemoJornadaHistory } from './seed-demo-jornada-history';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(SeedOperationalModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const dataSource = app.get(DataSource);
    const companies = await dataSource.getRepository(Company).find({
      where: {
        rut: In([SEED_DEV_COMPANY.rut, SEED_DEV_COMPANY_SECOND.rut]),
      },
    });
    if (!companies.length) {
      throw new Error(
        `Empresas demo no encontradas. Ejecutá seed:demo primero.`,
      );
    }

    for (const company of companies) {
      console.log(
        `\n—— Jornada seed · ${company.nombreFantasia ?? company.razonSocial} (${company.rut}) ——`,
      );
      await TenantContext.run(
        { activeCompanyId: company.id, userId: null, rol: null },
        async () => {
          await seedDemoJornadaHistory({
            dataSource,
            companyId: company.id,
          });
        },
      );
    }
  } finally {
    await app.close();
  }
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
