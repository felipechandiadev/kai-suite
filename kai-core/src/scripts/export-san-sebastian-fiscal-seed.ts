#!/usr/bin/env ts-node
/**
 * Exporta datos fiscales SII de San Sebastián desde la DB hacia seeds/san-sebastian/data/fiscal/.
 * Uso: cd kai-core && npm run fiscal:export-ss-seed
 *
 * Genera emisor.json, caf-boleta-39.xml y certificado.pfx desde la DB.
 */
import * as fs from 'fs';
import * as path from 'path';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from '../app.module';
import { Company } from '@modules/companies/domain/company.entity';
import { FiscalCertificate } from '@modules/fiscal/domain/fiscal-certificate.entity';
import { FiscalCaf } from '@modules/fiscal/domain/fiscal-caf.entity';
import {
  FiscalCafPackageStatus,
  SiiEnvironment,
} from '@modules/fiscal/domain/fiscal.enums';
import { FiscalCryptoService } from '@modules/fiscal/infrastructure/fiscal-crypto.service';

const DEFAULT_RUT = '78.543.570-2';
const OUT_DIR = path.resolve(
  __dirname,
  '../../../seeds/san-sebastian/data/fiscal',
);

type EmisorJson = {
  commune: string;
  city: string;
  siiResolutionNumber: string;
  siiResolutionDate: string;
};

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const ds = app.get(DataSource);
    const crypto = app.get(FiscalCryptoService);

    const rut = process.env.SEED_COMPANY_RUT?.trim() || DEFAULT_RUT;
    const companyRepo = ds.getRepository(Company);
    const company = await companyRepo.findOne({
      where: { rut, deletedAt: null as never },
    });

    if (!company) {
      console.error(`No se encontró empresa con RUT ${rut}.`);
      process.exit(1);
    }

    if (
      !company.commune?.trim() ||
      !company.city?.trim() ||
      !company.siiResolutionNumber?.trim() ||
      !company.siiResolutionDate
    ) {
      console.error(
        'La empresa no tiene emisor SII completo (commune, city, siiResolutionNumber, siiResolutionDate).',
      );
      process.exit(1);
    }

    const cafRepo = ds.getRepository(FiscalCaf);
    const caf = await cafRepo.findOne({
      where: {
        companyId: company.id,
        environment: SiiEnvironment.PRODUCTION,
        dteType: 39,
        status: FiscalCafPackageStatus.ACTIVE,
        isActive: true,
      },
      order: { uploadedAt: 'DESC' },
    });

    if (!caf?.encryptedCafXml || !caf.cafIv) {
      console.error('No hay CAF de producción activo (tipo 39) para esta empresa.');
      process.exit(1);
    }

    const certRepo = ds.getRepository(FiscalCertificate);
    const cert = await certRepo.findOne({ where: { companyId: company.id } });
    if (!cert) {
      console.error('No hay certificado digital cargado para esta empresa.');
      process.exit(1);
    }

    fs.mkdirSync(OUT_DIR, { recursive: true });

    const emisor: EmisorJson = {
      commune: company.commune.trim(),
      city: company.city.trim(),
      siiResolutionNumber: company.siiResolutionNumber.trim(),
      siiResolutionDate: String(company.siiResolutionDate).slice(0, 10),
    };

    const emisorPath = path.join(OUT_DIR, 'emisor.json');
    fs.writeFileSync(emisorPath, `${JSON.stringify(emisor, null, 2)}\n`, 'utf8');
    console.log(`✅ emisor.json → ${emisorPath}`);

    const cafXml = crypto.decrypt(caf.encryptedCafXml, caf.cafIv).toString('utf8');
    const cafPath = path.join(OUT_DIR, 'caf-boleta-39.xml');
    fs.writeFileSync(cafPath, cafXml, 'utf8');
    console.log(
      `✅ caf-boleta-39.xml → ${cafPath} (folios ${caf.rangeFrom}–${caf.rangeTo})`,
    );

    const pfxBytes = crypto.decrypt(cert.encryptedPfx, cert.pfxIv);
    const pfxPath = path.join(OUT_DIR, 'certificado.pfx');
    fs.writeFileSync(pfxPath, pfxBytes);
    console.log(`✅ certificado.pfx → ${pfxPath}`);

    console.log('');
    console.log('Certificado exportado desde DB:');
    console.log(`  subjectRut: ${cert.subjectRut}`);
    console.log(`  vigencia: ${cert.notBefore} → ${cert.notAfter}`);
    console.log('');
    console.log(
      'Configure SAN_SEBASTIAN_SII_PFX_PASSWORD en kai-core/.env antes de ejecutar seed:san-sebastian.',
    );
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
