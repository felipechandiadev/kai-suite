import * as forge from 'node-forge';
import { FiscalXmlSchemaValidator } from '../../infrastructure/fiscal-xml-schema.validator';
import { SiiBoletaAuthService } from '../../infrastructure/sii-boleta-auth.service';
import {
  buildEnvioBoletaXml,
  buildSaleDteBoletaXml,
} from '../../infrastructure/boleta-envio.builder';
import type { SaleBoletaDocument } from '../../domain/sale-boleta.types';

const EMISOR = {
  rut: '78.543.570-2',
  legalName: 'TAPIA Y COFRE LIMITADA',
  businessActivity: 'SUPERMERCADO',
  address: 'DIECIOCHO #900 AJIAL',
  commune: 'Parral',
  city: 'Parral',
  resolutionNumber: '80',
  resolutionDate: '2014-08-22',
};

function buildTestCafFixture(): string {
  const keys = forge.pki.rsa.generateKeyPair({ bits: 512, e: 0x10001 });
  const privateKeyPem = forge.pki.privateKeyToPem(keys.privateKey);
  const m = forge.util.encode64(
    keys.publicKey.n
      .toByteArray()
      .map((b) => String.fromCharCode(b < 0 ? b + 256 : b))
      .join(''),
  );
  const exp = forge.util.encode64(
    keys.publicKey.e
      .toByteArray()
      .map((b) => String.fromCharCode(b < 0 ? b + 256 : b))
      .join(''),
  );
  return `<?xml version="1.0"?>
<AUTORIZACION>
<CAF version="1.0">
<DA>
<RE>78543570-2</RE>
<RS>TAPIA Y COFRE LIMITADA</RS>
<TD>39</TD>
<RNG><D>198581</D><H>198610</H></RNG>
<FA>2026-06-29</FA>
<RSAPK><M>${m}</M><E>${exp}</E></RSAPK>
<IDK>300</IDK>
</DA>
<FRMA algoritmo="SHA1withRSA">dGVzdA==</FRMA>
</CAF>
<RSASK>${privateKeyPem}</RSASK>
</AUTORIZACION>`;
}

function createTestMaterial(): ReturnType<SiiBoletaAuthService['loadPfx']> {
  const keys = forge.pki.rsa.generateKeyPair(1024);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date('2020-01-01');
  cert.validity.notAfter = new Date('2030-01-01');
  const attrs = [{ name: 'commonName', value: 'Test Signer' }];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(keys.privateKey, forge.md.sha256.create());
  return {
    privateKeyPem: forge.pki.privateKeyToPem(keys.privateKey),
    certificatePem: forge.pki.certificateToPem(cert),
    certificateDer: Buffer.from(
      forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes(),
      'binary',
    ),
  };
}

function buildSignedEnvioFixture(): string {
  const auth = new SiiBoletaAuthService();
  const material = createTestMaterial();
  const doc: SaleBoletaDocument = {
    receptor: { rut: '66666666-6', name: 'Cliente' },
    lines: [{ name: 'Producto test', quantity: 1, unitPriceWithIva: 1190 }],
  };
  const { dteXml } = buildSaleDteBoletaXml(EMISOR, doc, 198581, {
    cafXml: buildTestCafFixture(),
    issuedAt: '2026-06-29',
  });
  const signedDte = auth.signDteBoleta(
    dteXml.replace(/^<\?xml[^>]*\?>\s*/i, '<?xml version="1.0" encoding="ISO-8859-1"?>\n'),
    'F198581T39',
    material,
  );
  const envio = buildEnvioBoletaXml(EMISOR, [signedDte], EMISOR.rut);
  return auth.signEnvioBoleta(envio, material);
}

describe('FiscalXmlSchemaValidator', () => {
  const validator = new FiscalXmlSchemaValidator();
  validator.onModuleInit();

  it('accepts signed EnvioBOLETA from sale builder', () => {
    const signedEnvio = buildSignedEnvioFixture();
    const result = validator.validateEnvioBoletaXml(signedEnvio);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('rejects DTE signature inside Documento', () => {
    const signedEnvio = buildSignedEnvioFixture();
    const movedInside = signedEnvio.replace(
      /(<\/Documento>)(\s*<Signature xmlns="http:\/\/www.w3.org\/2000\/09\/xmldsig#">[\s\S]*?<\/Signature>)/,
      '$2$1',
    );
    const result = validator.validateEnvioBoletaXml(movedInside);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('dentro de Documento'))).toBe(true);
  });
});
