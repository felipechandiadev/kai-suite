#!/usr/bin/env ts-node
/**
 * Importa fiscal San Sebastián (cert, CAF, folios, emisor) a una empresa existente
 * sin ejecutar el seed completo (no TRUNCATE).
 *
 * Uso:
 *   npm run import-fiscal-to-company --prefix seeds
 *
 * Variables opcionales:
 *   TARGET_COMPANY_ID  (default: NEXT_PUBLIC_COMPANY_ID_POS o demo)
 *   TARGET_POS_ID      (default: primer POS de la empresa, preferir "Caja 1")
 */
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { MinimalSeedModule } from '../shared/minimal-seed.module';
import { TenantContext } from '@common/tenant/tenant.context';
import { Company } from '@modules/companies/domain/company.entity';
import { PointOfSale } from '@modules/points-of-sale/domain/point-of-sale.entity';
import {
  SEED_SAN_SEBASTIAN_COMPANY,
  getSeedSanSebastianSiiEmisorFields,
} from './seed-san-sebastian-config';
import { seedSanSebastianFiscal } from './seed-san-sebastian-fiscal.ts';

const DEFAULT_COMPANY_ID = '24780018-649b-4d43-8318-cad6cef745bc';

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
  const companyId =
    process.env.TARGET_COMPANY_ID?.trim() ||
    process.env.NEXT_PUBLIC_COMPANY_ID_POS?.trim() ||
    DEFAULT_COMPANY_ID;
  const explicitPosId = process.env.TARGET_POS_ID?.trim();

  const app = await NestFactory.createApplicationContext(MinimalSeedModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const dataSource = app.get(DataSource);
    const companyRepo = dataSource.getRepository(Company);
    const posRepo = dataSource.getRepository(PointOfSale);

    const company = await companyRepo.findOne({ where: { id: companyId } });
    if (!company) {
      throw new Error(`Empresa no encontrada: ${companyId}`);
    }

    const siiEmisor = getSeedSanSebastianSiiEmisorFields();
    const { posId, posName } = await resolvePosId(dataSource, companyId, explicitPosId);

    console.log(`→ Empresa objetivo: ${company.razonSocial} (${company.id})`);
    console.log(`→ POS objetivo: ${posName} (${posId})`);
    console.log('→ Actualizando datos emisor San Sebastián (sin truncar catálogo)...');

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
    console.log(`✅ Empresa actualizada: RUT ${company.rut}`);

    await TenantContext.run(
      { activeCompanyId: companyId, userId: null, rol: null },
      async () => {
        await seedSanSebastianFiscal({
          app,
          companyId,
          posId,
          posRepo,
        });
      },
    );

    console.log('');
    console.log('✅ Import fiscal San Sebastián completado');
    console.log(`   companyId=${companyId}`);
    console.log(`   posId=${posId} (${posName})`);
    console.log('   Abre caja en ese POS y emite BOLETA para probar.');
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  console.error('❌ Error importando fiscal San Sebastián:', err);
  process.exit(1);
});
