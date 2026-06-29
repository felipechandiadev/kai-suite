import { Injectable } from '@nestjs/common';
import * as forge from 'node-forge';
import { extractSeedFromSemillaXml } from './fiscal-xml.util';

const CANONICALIZATION = 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315';
const SIGNATURE_METHOD = 'http://www.w3.org/2000/09/xmldsig#rsa-sha1';
const DIGEST_METHOD = 'http://www.w3.org/2000/09/xmldsig#sha1';
const TRANSFORM_ENVELOPED =
  'http://www.w3.org/2000/09/xmldsig#enveloped-signature';

export type PfxMaterial = {
  privateKeyPem: string;
  certificatePem: string;
  certificateDer: Buffer;
};

@Injectable()
export class SiiBoletaAuthService {
  loadPfx(pfxBuffer: Buffer, password: string): PfxMaterial {
    const asn1 = forge.asn1.fromDer(forge.util.createBuffer(pfxBuffer.toString('binary')));
    const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, password);
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
    const certBag = certBags[forge.pki.oids.certBag]?.[0];
    const keyBag =
      keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0] ??
      p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag]?.[0];
    if (!certBag?.cert || !keyBag?.key) {
      throw new Error('No se pudo extraer certificado o llave del archivo PFX');
    }
    const cert = certBag.cert as forge.pki.Certificate;
    const key = keyBag.key as forge.pki.PrivateKey;
    return {
      privateKeyPem: forge.pki.privateKeyToPem(key),
      certificatePem: forge.pki.certificateToPem(cert),
      certificateDer: Buffer.from(
        forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes(),
        'binary',
      ),
    };
  }

  getCertificateMetadata(pfxBuffer: Buffer, password: string): {
    subjectRut: string | null;
    notBefore: Date;
    notAfter: Date;
  } {
    const { certificatePem } = this.loadPfx(pfxBuffer, password);
    const cert = forge.pki.certificateFromPem(certificatePem);
    const subj = cert.subject.attributes
      .map((a) => `${(a.shortName ?? a.name) ?? ''}=${a.value}`)
      .join(',');
    const rutMatch = subj.match(/(\d{7,8}-[\dkK])/i);
    return {
      subjectRut: rutMatch?.[1]?.toUpperCase() ?? null,
      notBefore: cert.validity.notBefore,
      notAfter: cert.validity.notAfter,
    };
  }

  buildSignedGetTokenXml(seed: string, material: PfxMaterial): string {
    const unsigned = `<?xml version="1.0" encoding="UTF-8"?>\n<getToken><item><Semilla>${seed}</Semilla></item></getToken>`;
    return this.signXmlEnveloped(unsigned, 'getToken', material);
  }

  signXmlEnveloped(unsignedXml: string, rootTag: string, material: PfxMaterial): string {
    const digestValue = this.sha1Base64(
      `<${rootTag}>${this.extractInner(unsignedXml, rootTag)}</${rootTag}>`,
    );
    const signedInfo = `<SignedInfo><CanonicalizationMethod Algorithm="${CANONICALIZATION}"/><SignatureMethod Algorithm="${SIGNATURE_METHOD}"/><Reference URI=""><Transforms><Transform Algorithm="${TRANSFORM_ENVELOPED}"/></Transforms><DigestMethod Algorithm="${DIGEST_METHOD}"/><DigestValue>${digestValue}</DigestValue></Reference></SignedInfo>`;
    const signatureValue = this.rsaSignBase64(signedInfo, material.privateKeyPem);
    const certB64 = material.certificateDer.toString('base64');
    const x509 = this.chunk64(certB64);
    const signatureBlock = `<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">${signedInfo}<SignatureValue>${signatureValue}</SignatureValue><KeyInfo><KeyValue><RSAKeyValue>${this.rsaKeyValue(material.privateKeyPem)}</RSAKeyValue></KeyValue><X509Data><X509Certificate>${x509}</X509Certificate></X509Data></KeyInfo></Signature>`;
    return unsignedXml.replace(
      `</${rootTag}>`,
      `${signatureBlock}</${rootTag}>`,
    );
  }

  private extractInner(xml: string, tag: string): string {
    const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*)</${tag}>`);
    const m = xml.match(re);
    return m?.[1] ?? '';
  }

  private sha1Base64(content: string): string {
    const md = forge.md.sha1.create();
    md.update(content, 'utf8');
    return forge.util.encode64(md.digest().getBytes());
  }

  private rsaSignBase64(content: string, privateKeyPem: string): string {
    const key = forge.pki.privateKeyFromPem(privateKeyPem);
    const md = forge.md.sha1.create();
    md.update(content, 'utf8');
    return forge.util.encode64(key.sign(md));
  }

  private rsaKeyValue(privateKeyPem: string): string {
    const key = forge.pki.privateKeyFromPem(privateKeyPem);
    const n = forge.util.encode64(
      key.n.toByteArray().map((b) => String.fromCharCode(b < 0 ? b + 256 : b)).join(''),
    );
    const e = forge.util.encode64(
      key.e.toByteArray().map((b) => String.fromCharCode(b < 0 ? b + 256 : b)).join(''),
    );
    return `<Modulus>${this.chunk64(n)}</Modulus><Exponent>${this.chunk64(e)}</Exponent>`;
  }

  private chunk64(b64: string): string {
    return b64.match(/.{1,64}/g)?.join('\n') ?? b64;
  }

  parseSeed(xml: string): string {
    return extractSeedFromSemillaXml(xml);
  }
}
