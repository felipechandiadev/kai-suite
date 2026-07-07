import * as forge from 'node-forge';
import { SET_BE_CASES } from '../../domain/set-be.constants';
import { buildTedStampForSetBeCase } from '../../domain/fiscal-caf-ted';
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

describe('fiscal-caf-ted integration', () => {
  const cafXml = buildTestCafFixture();

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
