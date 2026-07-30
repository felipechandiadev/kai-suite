/**
 * Diagnóstico: arma y firma EnvioBOLETA como venta POS y valida estructura XML.
 * Uso: npx ts-node -r tsconfig-paths/register src/scripts/debug-boleta-envio-xml.ts
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DataSource } from 'typeorm';
import { Company } from '@modules/companies/domain/company.entity';
import { FiscalCertificate } from '@modules/fiscal/domain/fiscal-certificate.entity';
import { FiscalCaf } from '@modules/fiscal/domain/fiscal-caf.entity';
import { FiscalCryptoService } from '@modules/fiscal/infrastructure/fiscal-crypto.service';
import { SiiBoletaAuthService } from '@modules/fiscal/infrastructure/sii-boleta-auth.service';
import { buildEnvioBoletaXml, buildSaleDteBoletaXml } from '@modules/fiscal/infrastructure/boleta-envio.builder';
import { emisorFromCompany } from '@modules/fiscal/domain/fiscal-emisor-from-company';
import { ConfigService } from '@nestjs/config';
import { SiiEnvironment } from '@modules/fiscal/domain/fiscal.enums';
import { FiscalXmlSchemaValidator } from '@modules/fiscal/infrastructure/fiscal-xml-schema.validator';

const FOLIO = 198598;

function createCrypto(): FiscalCryptoService {
  const crypto = new FiscalCryptoService(
    new ConfigService({ FISCAL_ENCRYPTION_KEY: process.env.FISCAL_ENCRYPTION_KEY }),
  );
  crypto.onModuleInit();
  return crypto;
}

function countTag(xml: string, tag: string): { open: number; close: number } {
  const open = (xml.match(new RegExp(`<${tag}[\\s>]`, 'gi')) ?? []).length;
  const close = (xml.match(new RegExp(`</${tag}>`, 'gi')) ?? []).length;
  return { open, close };
}

function assertBalanced(xml: string, tags: string[]): void {
  for (const tag of tags) {
    const { open, close } = countTag(xml, tag);
    console.log(`  ${tag}: open=${open} close=${close}${open === close ? ' OK' : ' MISMATCH'}`);
  }
}

async function main() {
  require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
  const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_USERNAME ?? 'kai',
    password: process.env.DB_PASSWORD ?? 'kai123',
    database: process.env.DB_DATABASE ?? 'kai-demo',
    entities: [Company, FiscalCertificate, FiscalCaf],
  });
  await ds.initialize();

  const companyId = '0089d38b-9f48-4744-94ef-b11c5d845243';
  const company = await ds.getRepository(Company).findOne({ where: { id: companyId } });
  if (!company) throw new Error('No company');

  const cert = await ds.getRepository(FiscalCertificate).findOne({
    where: { companyId: company.id },
    order: { uploadedAt: 'DESC' },
  });
  const caf = await ds.getRepository(FiscalCaf).findOne({
    where: { companyId: company.id, environment: SiiEnvironment.PRODUCTION, isActive: true },
    order: { uploadedAt: 'DESC' },
  });
  if (!cert || !caf) throw new Error('Missing cert or caf');

  const crypto = createCrypto();
  const auth = new SiiBoletaAuthService();
  const pfx = crypto.decrypt(cert.encryptedPfx, cert.pfxIv);
  const pass = crypto.decrypt(cert.encryptedPassword, cert.passwordIv).toString('utf8');
  const material = auth.loadPfx(pfx, pass);
  const cafXml = crypto.decrypt(caf.encryptedCafXml, caf.cafIv).toString('utf8');
  const emisor = emisorFromCompany(company);

  const doc = {
    receptor: { rut: '66666666-6', name: 'Cliente' },
    lines: [{ name: 'Calcetines deportivos', quantity: 1, unitPriceWithIva: 500 }],
  };

  const { dteXml } = buildSaleDteBoletaXml(emisor, doc, FOLIO, {
    cafXml,
    issuedAt: '2026-07-01',
  });
  const signedDte = auth.signDteBoleta(
    dteXml.replace(/^<\?xml[^>]*\?>\s*/i, '<?xml version="1.0" encoding="ISO-8859-1"?>\n'),
    `F${FOLIO}T39`,
    material,
  );
  const envio = buildEnvioBoletaXml(emisor, [signedDte], auth.getSignerRut(material) ?? emisor.rut);
  const signedEnvio = auth.signEnvioBoleta(envio, material);

  const outDir = path.join(__dirname, '../../../tmp');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'envio-debug.xml'), signedEnvio, 'utf8');
  fs.writeFileSync(path.join(outDir, 'dte-debug.xml'), signedDte, 'utf8');
  console.log('Written to tmp/envio-debug.xml');

  console.log('Envio length:', signedEnvio.length);
  console.log('Envio ends with:', signedEnvio.slice(-80));
  console.log('\nDTE tag balance:');
  assertBalanced(signedDte, ['DTE', 'Documento', 'Signature', 'TED']);
  console.log('\nEnvio tag balance:');
  assertBalanced(signedEnvio, ['EnvioBOLETA', 'SetDTE', 'Caratula', 'DTE', 'Signature']);

  const hasEnvioClose = signedEnvio.includes('</EnvioBOLETA>');
  console.log('\nHas </EnvioBOLETA>:', hasEnvioClose);
  if (!hasEnvioClose) {
    console.error('PROBLEM: EnvioBOLETA not closed — explains SII LPX-00007 EOF');
  }

  const schemaValidator = new FiscalXmlSchemaValidator();
  schemaValidator.onModuleInit();
  const xsd = schemaValidator.validateEnvioBoletaXml(signedEnvio);
  console.log('\nXSD validation:', xsd.valid ? 'OK' : 'FAIL');
  if (!xsd.valid) {
    for (const err of xsd.errors.slice(0, 8)) {
      console.log(' -', err);
    }
  }

  await ds.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
