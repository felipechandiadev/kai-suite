#!/usr/bin/env ts-node
/**
 * Carga fiscal San Sebastián (emisor + certificado) sobre la empresa demo existente.
 * No TRUNCATE — conserva catálogo demo. Omite CAF/folios (subir en Admin después).
 *
 * Uso (desde raíz del monorepo):
 *   npm run import-fiscal-ss-to-demo
 *
 * Prerrequisitos:
 *   - seed:demo ejecutado previamente
 *   - FISCAL_ENCRYPTION_KEY y SAN_SEBASTIAN_SII_PFX_PASSWORD en env
 *   - certificado.pfx en seeds/san-sebastian/data/fiscal/
 *
 * Variables opcionales:
 *   TARGET_COMPANY_ID  (default: NEXT_PUBLIC_COMPANY_ID_POS o Kai Suite por RUT)
 *   TARGET_POS_ID      (default: «Caja 1» o primer POS)
 */
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { MinimalSeedModule } from '../shared/minimal-seed.module';
import { TenantContext } from '@common/tenant/tenant.context';
import { Company } from '@modules/companies/domain/company.entity';
import { PointOfSale } from '@modules/points-of-sale/domain/point-of-sale.entity';
import { SEED_DEV_COMPANY } from './config';
import {
  SEED_SAN_SEBASTIAN_COMPANY,
  getSeedSanSebastianSiiEmisorFields,
} from '../san-sebastian/seed-san-sebastian-config';
import { seedSanSebastianFiscal } from '../san-sebastian/seed-san-sebastian-fiscal';

async function resolveDemoCompanyId(dataSource: DataSource): Promise<Company> {
  const explicitId =
    process.env.TARGET_COMPANY_ID?.trim() ||
    process.env.NEXT_PUBLIC_COMPANY_ID_POS?.trim();
  const companyRepo = dataSource.getRepository(Company);

  if (explicitId) {
    const row = await companyRepo.findOne({ where: { id: explicitId } });
    if (!row) throw new Error(`Empresa no encontrada: ${explicitId}`);
    return row;
  }

  const demoRut = process.env.SEED_COMPANY_RUT?.trim() || SEED_DEV_COMPANY.rut;
  const byRut = await companyRepo.findOne({
    where: { rut: demoRut, deletedAt: null as never },
  });
  if (!byRut) {
    throw new Error(
      `Empresa demo no encontrada (RUT ${demoRut}). Ejecute npm run seed:demo primero.`,
    );
  }
  return byRut;
}

async function resolvePosId(
  dataSource: DataSource,
  companyId: string,
  explicitPosId?: string,
): Promise<{ posId: string; posName: string }> {
  const posRepo = dataSource.getRepository(PointOfSale);
  if (explicitPosId?.trim()) {
    const row = await posRepo.findOne({ where: { id: explicitPosId.trim(), companyId } });
    if (!row) throw new Error(`POS no encontrado: ${explicitPosId}`);
    return { posId: row.id, posName: row.name };
  }
  const rows = await posRepo.find({ where: { companyId }, order: { name: 'ASC' } });
  const caja1 = rows.find((r) => r.name.trim().toLowerCase() === 'caja 1');
  const pick = caja1 ?? rows[0];
  if (!pick) throw new Error(`Sin puntos de venta para companyId=${companyId}`);
  return { posId: pick.id, posName: pick.name };
}

async function main() {
  const explicitPosId = process.env.TARGET_POS_ID?.trim();

  const app = await NestFactory.createApplicationContext(MinimalSeedModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const dataSource = app.get(DataSource);
    const companyRepo = dataSource.getRepository(Company);
    const posRepo = dataSource.getRepository(PointOfSale);

    const company = await resolveDemoCompanyId(dataSource);
    const companyId = company.id;
    const siiEmisor = getSeedSanSebastianSiiEmisorFields();
    const { posId, posName } = await resolvePosId(dataSource, companyId, explicitPosId);

    console.log(`→ Empresa demo: ${company.razonSocial} (${companyId})`);
    console.log(`→ POS objetivo: ${posName} (${posId})`);
    console.log('→ Aplicando emisor y certificado San Sebastián (sin CAF/folios)...');

    company.razonSocial = SEED_SAN_SEBASTIAN_COMPANY.razonSocial;
    company.nombreFantasia = SEED_SAN_SEBASTIAN_COMPANY.nombreFantasia;
    company.rut = SEED_SAN_SEBASTIAN_COMPANY.rut;
    company.address = SEED_SAN_SEBASTIAN_COMPANY.address;
    company.mail = SEED_SAN_SEBASTIAN_COMPANY.mail;
    company.phone = SEED_SAN_SEBASTIAN_COMPANY.phone;
    company.businessActivity = SEED_SAN_SEBASTIAN_COMPANY.businessActivity;
    company.defaultCurrency = SEED_SAN_SEBASTIAN_COMPANY.defaultCurrency;
    company.commune = siiEmisor.commune;
    company.city = siiEmisor.city;
    company.siiResolutionNumber = siiEmisor.siiResolutionNumber;
    company.siiResolutionDate = siiEmisor.siiResolutionDate;
    await companyRepo.save(company);
    console.log(`✅ Emisor actualizado: RUT ${company.rut} (${company.commune})`);

    await TenantContext.run(
      { activeCompanyId: companyId, userId: null, rol: null },
      async () => {
        await seedSanSebastianFiscal({
          app,
          companyId,
          posId,
          posRepo,
          skipCaf: true,
        });
      },
    );

    console.log('');
    console.log('✅ Fiscal San Sebastián aplicado sobre demo');
    console.log(`   companyId=${companyId}`);
    console.log(`   posId=${posId} (${posName})`);
    console.log('   Siguiente: Admin → SII → subir CAF, asignar folios al POS y habilitar producción.');
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  console.error('❌ Error import-fiscal-ss-to-demo:', err);
  process.exit(1);
});
