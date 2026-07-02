import * as forge from 'node-forge';
import { SET_BE_CASES } from '../../domain/set-be.constants';
import {
  buildTedStamp,
  buildTedStampForSetBeCase,
  extractCafSigningMaterial,
  signTedDd,
} from '../../domain/fiscal-caf-ted';
import { buildDteBoletaXml } from '../../infrastructure/boleta-envio.builder';

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

describe('fiscal-caf-ted', () => {
  const cafXml = buildTestCafFixture();

  it('extractCafSigningMaterial obtiene CAF y llave PEM', () => {
    const material = extractCafSigningMaterial(cafXml);
    expect(material.cafBlockXml).toContain('<CAF version="1.0">');
    expect(material.cafBlockXml).toContain('<TD>39</TD>');
    expect(material.privateKeyPem).toContain('BEGIN RSA PRIVATE KEY');
  });

  it('signTedDd produce firma base64 estable', () => {
    const { privateKeyPem } = extractCafSigningMaterial(cafXml);
    const dd = '<DD><RE>78543570-2</RE><TD>39</TD></DD>';
    const sig1 = signTedDd(dd, privateKeyPem);
    const sig2 = signTedDd(dd, privateKeyPem);
    expect(sig1).toBe(sig2);
    expect(sig1.length).toBeGreaterThan(20);
  });

  it('buildTedStamp incluye TED, DD, CAF y FRMT', () => {
    const ted = buildTedStamp({
      rutEmisor: '78543570-2',
      tipoDte: 39,
      folio: 198581,
      fechaEmision: '2026-06-29',
      rutReceptor: '66666666-6',
      razonSocialReceptor: 'Cliente Certificacion',
      mntTotal: 600,
      primerItem: 'nombrre',
      cafXml,
      timestamp: '2026-06-29T15:00:00',
    });
    expect(ted).toContain('<TED version="1.0">');
    expect(ted).toContain('<F>198581</F>');
    expect(ted).toContain('<MNT>600</MNT>');
    expect(ted).toContain('<IT1>nombrre</IT1>');
    expect(ted).toContain('<CAF version="1.0">');
    expect(ted).toContain('<FRMT algoritmo="SHA1withRSA">');
    expect(ted).toContain('<TSTED>2026-06-29T15:00:00</TSTED>');
  });

  it('buildTedStampForSetBeCase para CASO-1', () => {
    const { tedXml, tmstFirma } = buildTedStampForSetBeCase(
      '78543570-2',
      SET_BE_CASES[0],
      198581,
      cafXml,
      '2026-06-29',
    );
    expect(tedXml).toContain('<IT1>Cambio de aceite</IT1>');
    expect(tmstFirma).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('buildDteBoletaXml con cafXml incluye TED y TmstFirma', () => {
    const emisor = {
      rut: '78543570-2',
      legalName: 'TAPIA Y COFRE LIMITADA',
      businessActivity: 'SUPERMERCADO',
      address: 'DIECIOCHO #900 AJIAL',
      commune: 'Parral',
      city: 'Parral',
      resolutionNumber: '80',
      resolutionDate: '2014-08-22',
    };
    const xml = buildDteBoletaXml(emisor, SET_BE_CASES[0], 198581, {
      cafXml,
      issuedAt: '2026-06-29',
    });
    expect(xml).toContain('<TED version="1.0">');
    expect(xml).toContain('<TmstFirma>');
    expect(xml).toContain('<Folio>198581</Folio>');
  });
});
