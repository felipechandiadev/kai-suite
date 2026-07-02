import { buildSaleDteBoletaXml } from '../../infrastructure/boleta-envio.builder';
import type { SaleBoletaDocument } from '../../domain/sale-boleta.types';
import * as forge from 'node-forge';

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

describe('buildSaleDteBoletaXml', () => {
  const doc: SaleBoletaDocument = {
    receptor: { rut: '66666666-6', name: 'Cliente' },
    lines: [{ name: 'Producto test', quantity: 1, unitPriceWithIva: 1190 }],
  };

  it('requires caf xml', () => {
    expect(() => buildSaleDteBoletaXml(EMISOR, doc, 198581)).toThrow(
      'CAF XML requerido',
    );
  });

  it('builds sale dte without SET reference', () => {
    const { dteXml } = buildSaleDteBoletaXml(EMISOR, doc, 198581, {
      cafXml: buildTestCafFixture(),
      issuedAt: '2026-06-29',
    });
    expect(dteXml).toContain('<RUTRecep>66666666-6</RUTRecep>');
    expect(dteXml).toContain('<RznSocRecep>Cliente</RznSocRecep>');
    expect(dteXml).not.toContain('CodRef>SET');
    expect(dteXml).toContain('<TED version="1.0">');
  });
});
