import { describe, expect, it } from 'vitest';
import * as forge from 'node-forge';
import {
  buildTedStamp,
  extractCafSigningMaterial,
  signTedDd,
} from './ted';

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

describe('@kai/fiscal-ted', () => {
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
});
