#!/usr/bin/env ts-node
/**
 * Exporta la configuración SII actual desde la DB hacia docs/SII/config-actual/.
 *
 * Uso: cd backend && npm run fiscal:export-docs-snapshot
 * RUT opcional: SEED_COMPANY_RUT=xx.xxx.xxx-d
 */
import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { createDecipheriv } from 'crypto';
import { DataSource } from 'typeorm';
import { AppDataSource } from '../config/data-source';
import { Company } from '@modules/companies/domain/company.entity';
import { FiscalProfile } from '@modules/fiscal/domain/fiscal-profile.entity';
import { FiscalCertificate } from '@modules/fiscal/domain/fiscal-certificate.entity';
import { FiscalCaf } from '@modules/fiscal/domain/fiscal-caf.entity';
import { PointOfSaleFolioAllocation } from '@modules/fiscal/domain/point-of-sale-folio-allocation.entity';
import { PointOfSale } from '@modules/points-of-sale/domain/point-of-sale.entity';

const OUT_DIR = path.resolve(__dirname, '../../../docs/SII/config-actual');

function decryptFiscal(data: Buffer, ivB64: string, keyB64: string): Buffer {
  const key = Buffer.from(keyB64, 'base64');
  if (key.length !== 32) {
    throw new Error('FISCAL_ENCRYPTION_KEY must be 32 bytes base64-encoded');
  }
  const iv = Buffer.from(ivB64, 'base64');
  const tag = data.subarray(data.length - 16);
  const enc = data.subarray(0, data.length - 16);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]);
}

async function resolveCompany(ds: DataSource): Promise<Company> {
  const companyRepo = ds.getRepository(Company);
  const rut = process.env.SEED_COMPANY_RUT?.trim();

  if (rut) {
    const byRut = await companyRepo.findOne({ where: { rut } });
    if (!byRut || byRut.deletedAt) {
      throw new Error(`No se encontró empresa con RUT ${rut}.`);
    }
    return byRut;
  }

  const cafRows = await ds.getRepository(FiscalCaf).find({
    order: { uploadedAt: 'DESC' },
    take: 1,
  });
  if (cafRows[0]) {
    const company = await companyRepo.findOne({ where: { id: cafRows[0].companyId } });
    if (company && !company.deletedAt) return company;
  }

  const profiles = await ds.getRepository(FiscalProfile).find({ take: 1 });
  if (profiles[0]) {
    const company = await companyRepo.findOne({ where: { id: profiles[0].companyId } });
    if (company && !company.deletedAt) return company;
  }

  throw new Error(
    'No hay empresa con configuración SII (CAF/perfil). Pase SEED_COMPANY_RUT=xx.xxx.xxx-d.',
  );
}

async function main() {
  const key = process.env.FISCAL_ENCRYPTION_KEY?.trim();
  if (!key) {
    throw new Error('FISCAL_ENCRYPTION_KEY no configurada en backend/.env');
  }

  const ds: DataSource = AppDataSource.isInitialized
    ? AppDataSource
    : await AppDataSource.initialize();

  try {
    const company = await resolveCompany(ds);
    console.log(`Empresa: ${company.razonSocial} (${company.rut})`);

    const profile = await ds.getRepository(FiscalProfile).findOne({
      where: { companyId: company.id },
    });
    const cert = await ds.getRepository(FiscalCertificate).findOne({
      where: { companyId: company.id },
    });
    const cafs = await ds.getRepository(FiscalCaf).find({
      where: { companyId: company.id },
      order: { uploadedAt: 'DESC' },
    });
    const allocations = await ds.getRepository(PointOfSaleFolioAllocation).find({
      where: { companyId: company.id },
      order: { rangeFrom: 'ASC' },
    });
    const posList = await ds.getRepository(PointOfSale).find({
      where: { companyId: company.id },
    });

    fs.mkdirSync(OUT_DIR, { recursive: true });
    const exportedAt = new Date().toISOString();

    const contribuyente = {
      exportedAt,
      company: {
        id: company.id,
        rut: company.rut,
        razonSocial: company.razonSocial,
        nombreFantasia: company.nombreFantasia ?? null,
        businessActivity: company.businessActivity ?? null,
        address: company.address ?? null,
        commune: company.commune ?? null,
        city: company.city ?? null,
        siiResolutionNumber: company.siiResolutionNumber ?? null,
        siiResolutionDate: company.siiResolutionDate
          ? String(company.siiResolutionDate).slice(0, 10)
          : null,
        mail: company.mail ?? null,
        phone: company.phone ?? null,
        defaultCurrency: company.defaultCurrency,
        isActive: company.isActive,
      },
      fiscalProfile: profile
        ? {
            companyId: profile.companyId,
            environment: profile.environment,
            status: profile.status,
            legalName: profile.legalName ?? null,
            rut: profile.rut ?? null,
            businessActivity: profile.businessActivity ?? null,
            address: profile.address ?? null,
            commune: profile.commune ?? null,
            city: profile.city ?? null,
            resolutionNumber: profile.resolutionNumber ?? null,
            resolutionDate: profile.resolutionDate
              ? String(profile.resolutionDate).slice(0, 10)
              : null,
            productionEnabled: profile.productionEnabled,
            portalPostulationDone: profile.portalPostulationDone,
            portalPermissionsDone: profile.portalPermissionsDone,
          }
        : null,
      certificate: cert
        ? {
            id: cert.id,
            subjectRut: cert.subjectRut,
            notBefore: cert.notBefore,
            notAfter: cert.notAfter,
            uploadedAt: cert.uploadedAt,
            file: 'certificado.pfx',
            note: 'PFX binario junto a este JSON. Password del .pfx no se exporta (usar variable de entorno al cargar).',
          }
        : null,
      pointsOfSale: posList.map((p) => ({
        id: p.id,
        name: p.name,
        deviceId: p.deviceId ?? null,
        isActive: p.isActive,
        fiscalSettings: p.settings?.fiscal ?? null,
      })),
    };

    fs.writeFileSync(
      path.join(OUT_DIR, 'contribuyente.json'),
      `${JSON.stringify(contribuyente, null, 2)}\n`,
      'utf8',
    );
    console.log('✅ contribuyente.json');

    const cafXmlById = new Map<string, string>();
    for (const caf of cafs) {
      if (!caf.encryptedCafXml || !caf.cafIv) continue;
      const xml = decryptFiscal(
        Buffer.from(caf.encryptedCafXml),
        caf.cafIv,
        key,
      ).toString('utf8');
      const safeCode = caf.packageCode.replace(/[^a-zA-Z0-9_-]+/g, '_');
      const filename = `caf-dte${caf.dteType}-${caf.environment}-${safeCode}.xml`;
      fs.writeFileSync(path.join(OUT_DIR, filename), xml, 'utf8');
      cafXmlById.set(caf.id, filename);
      console.log(
        `✅ ${filename} (folios ${caf.rangeFrom}–${caf.rangeTo}, next=${caf.nextFolio})`,
      );
    }

    const folios = {
      exportedAt,
      companyId: company.id,
      companyRut: company.rut,
      cafPackages: cafs.map((caf) => ({
        id: caf.id,
        packageCode: caf.packageCode,
        label: caf.label ?? null,
        status: caf.status,
        source: caf.source,
        dteType: caf.dteType,
        rangeFrom: caf.rangeFrom,
        rangeTo: caf.rangeTo,
        nextFolio: caf.nextFolio,
        environment: caf.environment,
        isActive: caf.isActive,
        uploadedAt: caf.uploadedAt,
        xmlFile: cafXmlById.get(caf.id) ?? null,
        remaining: Math.max(0, caf.rangeTo - caf.nextFolio + 1),
      })),
      folioAllocations: allocations.map((a) => ({
        id: a.id,
        cafId: a.cafId,
        subPackCode: a.subPackCode,
        label: a.label ?? null,
        pointOfSaleId: a.pointOfSaleId,
        dteType: a.dteType,
        rangeFrom: a.rangeFrom,
        rangeTo: a.rangeTo,
        nextFolio: a.nextFolio,
        environment: a.environment,
        isActive: a.isActive,
        remaining: Math.max(0, a.rangeTo - a.nextFolio + 1),
      })),
    };

    fs.writeFileSync(
      path.join(OUT_DIR, 'folios.json'),
      `${JSON.stringify(folios, null, 2)}\n`,
      'utf8',
    );
    console.log(`✅ folios.json (${cafs.length} CAF, ${allocations.length} asignaciones)`);

    if (cert?.encryptedPfx && cert.pfxIv) {
      const pfxBytes = decryptFiscal(Buffer.from(cert.encryptedPfx), cert.pfxIv, key);
      fs.writeFileSync(path.join(OUT_DIR, 'certificado.pfx'), pfxBytes);
      fs.writeFileSync(
        path.join(OUT_DIR, 'certificado-meta.json'),
        `${JSON.stringify(
          {
            exportedAt,
            subjectRut: cert.subjectRut,
            notBefore: cert.notBefore,
            notAfter: cert.notAfter,
            uploadedAt: cert.uploadedAt,
            file: 'certificado.pfx',
          },
          null,
          2,
        )}\n`,
        'utf8',
      );
      console.log('✅ certificado.pfx + certificado-meta.json');
    } else {
      console.warn('⚠️  Sin certificado digital en DB.');
    }

    const readme = `# Snapshot SII — configuración actual

Exportado: \`${exportedAt}\`  
Empresa: **${company.razonSocial}** (\`${company.rut}\`)

## Contenido

| Archivo | Descripción |
|---------|-------------|
| \`contribuyente.json\` | Emisor (companies) + perfil fiscal + meta certificado + settings fiscales de POS |
| \`folios.json\` | Tabla de CAF (\`fiscal_cafs\`) + asignaciones POS (\`point_of_sale_folio_allocations\`) con \`nextFolio\` |
| \`caf-*.xml\` | XML CAF desencriptado (uno por paquete en DB) |
| \`certificado.pfx\` | Certificado digital (sensible; no versionar) |
| \`certificado-meta.json\` | RUT firmante y vigencia |

## Cómo recrear en otra instancia

1. Crear/asegurar la empresa con el mismo RUT y datos de \`contribuyente.json\` → \`company\`.
2. Cargar certificado \`.pfx\` + password en Admin → SII.
3. Subir el/los \`caf-*.xml\` correspondientes.
4. Ajustar \`nextFolio\` en CAF y en asignaciones POS según \`folios.json\` (crítico si ya se emitieron boletas).
5. Replicar \`fiscalProfile\` (environment, productionEnabled, portal flags) y \`pointsOfSale[].fiscalSettings\`.

## Re-exportar

\`\`\`bash
cd backend
npm run fiscal:export-docs-snapshot
# opcional:
SEED_COMPANY_RUT=11.111.111-1 npm run fiscal:export-docs-snapshot
\`\`\`

## Seguridad

- \`*.pfx\` y \`*.xml\` están en \`.gitignore\`.
- No subir password del PFX al repositorio.
`;

    fs.writeFileSync(path.join(OUT_DIR, 'README.md'), readme, 'utf8');
    console.log('✅ README.md');
    console.log(`\n📁 Output: ${OUT_DIR}`);
  } finally {
    if (ds.isInitialized) await ds.destroy();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
