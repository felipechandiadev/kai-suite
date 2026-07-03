import * as fs from 'fs';
import * as path from 'path';
import type { INestApplicationContext } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Company } from '@modules/companies/domain/company.entity';
import { PointOfSale } from '@modules/points-of-sale/domain/point-of-sale.entity';
import { FiscalService } from '@modules/fiscal/application/fiscal.service';
import { FiscalCafPackageService } from '@modules/fiscal/application/fiscal-caf-package.service';
import { PosFolioAllocationService } from '@modules/fiscal/application/pos-folio-allocation.service';
import { SiiEnvironment } from '@modules/fiscal/domain/fiscal.enums';
import { isEmisorCompleteFromCompany } from '@modules/fiscal/domain/fiscal-emisor-from-company';
import {
  SEED_POS_NAME,
  SEED_SAN_SEBASTIAN_POS_FISCAL,
  loadSanSebastianSiiEmisor,
} from './seed-san-sebastian-config';

const FISCAL_DATA_DIR = path.join(__dirname, 'data/fiscal');
const DEFAULT_PFX_PATH = path.join(FISCAL_DATA_DIR, 'certificado.pfx');
const DEFAULT_CAF_PATH = path.join(FISCAL_DATA_DIR, 'caf-boleta-39.xml');

function resolveFiscalAssetPath(envKey: string, defaultPath: string): string {
  const override = process.env[envKey]?.trim();
  if (!override) return defaultPath;
  return path.isAbsolute(override) ? override : path.resolve(process.cwd(), override);
}

function requireFiscalAsset(filePath: string, label: string): Buffer {
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `No se encontró ${label} en ${filePath}. ` +
        'Copie certificado.pfx y caf-boleta-39.xml según seeds/san-sebastian/data/fiscal/README.md ' +
        'o ejecute: cd backend && npm run fiscal:export-ss-seed',
    );
  }
  return fs.readFileSync(filePath);
}

export async function seedSanSebastianFiscal(args: {
  app: INestApplicationContext;
  companyId: string;
  posId: string;
  posRepo: Repository<PointOfSale>;
}): Promise<void> {
  const { app, companyId, posId, posRepo } = args;

  const pfxPath = resolveFiscalAssetPath('SAN_SEBASTIAN_SII_PFX_PATH', DEFAULT_PFX_PATH);
  const cafPath = resolveFiscalAssetPath('SAN_SEBASTIAN_SII_CAF_PATH', DEFAULT_CAF_PATH);
  const pfxPassword = process.env.SAN_SEBASTIAN_SII_PFX_PASSWORD?.trim();
  if (!pfxPassword) {
    throw new Error(
      'SAN_SEBASTIAN_SII_PFX_PASSWORD no configurada en backend/.env (contraseña del certificado PFX).',
    );
  }

  const pfxBuffer = requireFiscalAsset(pfxPath, 'certificado PFX');
  const cafBuffer = requireFiscalAsset(cafPath, 'CAF boleta 39');

  const dataSource = app.get(DataSource);
  const companyRepo = dataSource.getRepository(Company);
  const company = await companyRepo.findOne({ where: { id: companyId } });
  if (!company) {
    throw new Error(`Empresa seed no encontrada: ${companyId}`);
  }
  if (!isEmisorCompleteFromCompany(company)) {
    throw new Error(
      'Emisor SII incompleto en company seed. Verifique commune, city, siiResolutionNumber y siiResolutionDate.',
    );
  }

  const fiscalService = app.get(FiscalService);
  const cafPackageService = app.get(FiscalCafPackageService);
  const allocationService = app.get(PosFolioAllocationService);

  await fiscalService.updateProfile(companyId, {
    environment: SiiEnvironment.PRODUCTION,
    portalPostulationDone: true,
    portalPermissionsDone: true,
  });

  await fiscalService.uploadCertificate(companyId, pfxBuffer, pfxPassword);
  console.log('✅ Certificado digital SII cargado');

  const cafPackage = await cafPackageService.uploadPackage(
    companyId,
    cafBuffer,
    SiiEnvironment.PRODUCTION,
  );
  console.log(
    `✅ CAF producción: ${cafPackage.packageCode} folios ${cafPackage.rangeFrom}–${cafPackage.rangeTo}`,
  );

  await fiscalService.acknowledgePortalCertification(companyId);
  await fiscalService.enableProduction(companyId, {
    productionEnabled: true,
    environment: SiiEnvironment.PRODUCTION,
  });
  console.log('✅ Perfil fiscal: certificado y producción habilitados');

  await allocationService.createSubPack(companyId, cafPackage.id, {
    pointOfSaleId: posId,
    rangeFrom: cafPackage.rangeFrom,
    rangeTo: cafPackage.rangeTo,
    label: SEED_POS_NAME,
  });
  console.log(`✅ Sub-paquete folios asignado a «${SEED_POS_NAME}»`);

  const posRow = await posRepo.findOne({ where: { id: posId } });
  if (!posRow) {
    throw new Error(`POS seed no encontrado: ${posId}`);
  }
  const currentSettings =
    posRow.settings && typeof posRow.settings === 'object'
      ? (posRow.settings as Record<string, unknown>)
      : {};
  posRow.settings = {
    ...currentSettings,
    fiscal: SEED_SAN_SEBASTIAN_POS_FISCAL,
  };
  await posRepo.save(posRow);
  console.log('✅ POS fiscal: TICKET + BOLETA (default BOLETA)');
}
