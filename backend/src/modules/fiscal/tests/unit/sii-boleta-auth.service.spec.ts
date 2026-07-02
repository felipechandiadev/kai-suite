import * as forge from 'node-forge';
import { SiiBoletaAuthService } from '../../infrastructure/sii-boleta-auth.service';

describe('SiiBoletaAuthService', () => {
  const auth = new SiiBoletaAuthService();

  function createTestMaterial(): {
    material: ReturnType<SiiBoletaAuthService['loadPfx']>;
  } {
    const keys = forge.pki.rsa.generateKeyPair(1024);
    const cert = forge.pki.createCertificate();
    cert.publicKey = keys.publicKey;
    cert.serialNumber = '01';
    cert.validity.notBefore = new Date('2020-01-01');
    cert.validity.notAfter = new Date('2030-01-01');
    const attrs = [
      { name: 'commonName', value: 'Test Signer' },
      { name: 'countryName', value: 'CL' },
    ];
    cert.setSubject(attrs);
    cert.setIssuer(attrs);
    cert.sign(keys.privateKey, forge.md.sha256.create());
    const privateKeyPem = forge.pki.privateKeyToPem(keys.privateKey);
    const certificatePem = forge.pki.certificateToPem(cert);
    const certificateDer = Buffer.from(
      forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes(),
      'binary',
    );
    return {
      material: { privateKeyPem, certificatePem, certificateDer },
    };
  }

  it('signs getToken with enveloped signature structure required by SII', () => {
    const { material } = createTestMaterial();
    const signed = auth.buildSignedGetTokenXml('163896290488', material);

    expect(signed).toContain('<getToken>');
    expect(signed).toContain('<Semilla>163896290488</Semilla>');
    expect(signed).toContain('<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">');
    expect(signed).toContain('<DigestValue>');
    expect(signed).toContain('<SignatureValue>');
    expect(signed).toContain('<KeyValue><RSAKeyValue>');
    expect(signed).toContain('<X509Certificate>');
    expect(signed).toContain('<Reference URI="">');
  });

  it('uses inclusive C14N and rsa-sha1 per SII spec', () => {
    const { material } = createTestMaterial();
    const signed = auth.buildSignedGetTokenXml('123', material);

    expect(signed).toContain(
      'Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"',
    );
    expect(signed).toContain(
      'Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"',
    );
    expect(signed).toContain(
      'Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"',
    );
  });

  it('places DTE signature after Documento inside DTE with URI reference', () => {
    const { material } = createTestMaterial();
    const unsigned = `<?xml version="1.0" encoding="ISO-8859-1"?>
<DTE version="1.0">
<Documento ID="F100T39">
<Encabezado><IdDoc><TipoDTE>39</TipoDTE><Folio>100</Folio></IdDoc></Encabezado>
<TmstFirma>2026-07-01T12:00:00</TmstFirma>
</Documento>
</DTE>`;
    const signed = auth.signDteBoleta(unsigned, 'F100T39', material);

    expect(signed).toContain('<Reference URI="#F100T39">');
    expect(signed).toContain(
      'Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"',
    );
    expect(signed).not.toContain('enveloped-signature');
    expect(signed).toMatch(/<\/Documento>\s*<Signature xmlns="http:\/\/www.w3.org\/2000\/09\/xmldsig#">[\s\S]*<\/DTE>/);
    expect(signed).not.toMatch(/<TmstFirma>[\s\S]*<Signature[\s\S]*<\/Documento>/);
  });

  it('places RCO signature inside DocumentoConsumoFolios', () => {
    const { material } = createTestMaterial();
    const unsigned = `<?xml version="1.0" encoding="ISO-8859-1"?>
<ConsumoFolios xmlns="http://www.sii.cl/SiiDte" version="1.0">
<DocumentoConsumoFolios ID="RCO_1_5">
<Caratula version="1.0"><RutEmisor>78543570-2</RutEmisor></Caratula>
<Resumen><TipoDocumento>39</TipoDocumento></Resumen>
</DocumentoConsumoFolios>
</ConsumoFolios>`;
    const signed = auth.signRcoDocumento(unsigned, 'RCO_1_5', material);
    expect(signed).toContain('<Reference URI="#RCO_1_5">');
    expect(signed).toMatch(
      /<Resumen>[\s\S]*<Signature xmlns="http:\/\/www.w3.org\/2000\/09\/xmldsig#">[\s\S]*<\/DocumentoConsumoFolios>/,
    );
  });

  it('encodes RSA modulus matching certificate SPKI (no signed leading zero)', () => {
    const { material } = createTestMaterial();
    const signed = auth.buildSignedGetTokenXml('1', material);
    const modulusB64 =
      signed.match(/<Modulus>([\s\S]*?)<\/Modulus>/)?.[1]?.replace(/\s/g, '') ?? '';
    const modulusBytes = Buffer.from(modulusB64, 'base64');
    const cert = forge.pki.certificateFromPem(material.certificatePem);
    const pub = cert.publicKey as forge.pki.rsa.PublicKey;
    let hex = pub.n.toString(16);
    if (hex.length % 2 === 1) hex = `0${hex}`;
    const expectedLen = forge.util.hexToBytes(hex).length;
    expect(modulusBytes.length).toBe(expectedLen);
  });
});
