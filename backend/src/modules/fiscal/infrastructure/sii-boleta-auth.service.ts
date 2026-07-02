import { Injectable } from '@nestjs/common';
import * as forge from 'node-forge';
import { SignedXml } from 'xml-crypto';
import { extractSeedFromSemillaXml } from './fiscal-xml.util';

const CANONICALIZATION = 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315';
const SIGNATURE_METHOD = 'http://www.w3.org/2000/09/xmldsig#rsa-sha1';
const DIGEST_METHOD = 'http://www.w3.org/2000/09/xmldsig#sha1';
const TRANSFORM_ENVELOPED =
  'http://www.w3.org/2000/09/xmldsig#enveloped-signature';
const TRANSFORM_C14N = 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315';

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
    const certBagsMap = p12.getBags({ bagType: forge.pki.oids.certBag });
    const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
    const keyBag =
      keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0] ??
      p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag]?.[0];
    if (!keyBag?.key) {
      throw new Error('No se pudo extraer certificado o llave del archivo PFX');
    }
    const key = keyBag.key as forge.pki.PrivateKey;
    const rsaKey = key as forge.pki.rsa.PrivateKey;
    const certList = certBagsMap[forge.pki.oids.certBag] ?? [];
    const matchedCert = certList
      .map((bag) => bag.cert as forge.pki.Certificate | undefined)
      .find((candidate) => {
        if (!candidate) return false;
        const pub = candidate.publicKey as forge.pki.rsa.PublicKey;
        return pub.n.equals(rsaKey.n) && pub.e.equals(rsaKey.e);
      });
    if (!matchedCert) {
      throw new Error('No se encontró certificado que corresponda a la llave del PFX');
    }
    return {
      privateKeyPem: forge.pki.privateKeyToPem(key),
      certificatePem: forge.pki.certificateToPem(matchedCert),
      certificateDer: Buffer.from(
        forge.asn1.toDer(forge.pki.certificateToAsn1(matchedCert)).getBytes(),
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

  getSignerRut(material: PfxMaterial): string | null {
    const cert = forge.pki.certificateFromPem(material.certificatePem);
    const subj = cert.subject.attributes
      .map((a) => `${(a.shortName ?? a.name) ?? ''}=${a.value}`)
      .join(',');
    const rutMatch = subj.match(/(\d{7,8}-[\dkK])/i);
    return rutMatch?.[1]?.toUpperCase() ?? null;
  }

  buildSignedGetTokenXml(seed: string, material: PfxMaterial): string {
    const unsigned = `<?xml version="1.0" encoding="UTF-8"?>\n<getToken><item><Semilla>${seed}</Semilla></item></getToken>`;
    return this.signXmlEnveloped(unsigned, 'getToken', material);
  }

  /** Firma Documento (ID F{folio}T39) — Signature como hijo de DTE, tras cerrar Documento. */
  signDteBoleta(dteXml: string, documentoId: string, material: PfxMaterial): string {
    return this.signXmlByElementId(dteXml, documentoId, material, {
      appendInsideTarget: false,
      signatureParentXPath: "//*[local-name(.)='DTE']",
      transforms: [TRANSFORM_C14N],
    });
  }

  /** Firma SetDTE (ID SetDoc) — Signature queda en EnvioBOLETA tras el SetDTE. */
  signEnvioBoleta(envioXml: string, material: PfxMaterial): string {
    return this.signXmlByElementId(envioXml, 'SetDoc', material, {
      appendInsideTarget: false,
      signatureParentXPath: "//*[local-name(.)='EnvioBOLETA']",
      transforms: [TRANSFORM_C14N],
    });
  }

  /** Firma DocumentoConsumoFolios (RCO) — Signature dentro del documento. */
  signRcoDocumento(rcoXml: string, documentoId: string, material: PfxMaterial): string {
    return this.signXmlByElementId(rcoXml, documentoId, material, {
      appendInsideTarget: true,
    });
  }

  signXmlEnveloped(unsignedXml: string, rootTag: string, material: PfxMaterial): string {
    const rootXpath = `//*[local-name(.)='${rootTag}']`;
    return this.signXmlByElementId(unsignedXml, '', material, {
      targetXpath: rootXpath,
      referenceUri: '',
      appendInsideTarget: true,
    });
  }

  private signXmlByElementId(
    unsignedXml: string,
    elementId: string,
    material: PfxMaterial,
    options: {
      targetXpath?: string;
      referenceUri?: string;
      appendInsideTarget: boolean;
      signatureParentXPath?: string;
      transforms?: string[];
    },
  ): string {
    const targetXpath =
      options.targetXpath ??
      (elementId ? `//*[@ID='${elementId}']` : `//*[local-name(.)='']`);
    const referenceUri =
      options.referenceUri ?? (elementId ? `#${elementId}` : '');
    const transforms = options.transforms ?? [TRANSFORM_ENVELOPED];
    const sig = new SignedXml({
      privateKey: material.privateKeyPem,
      publicCert: material.certificatePem,
      signatureAlgorithm: SIGNATURE_METHOD,
      canonicalizationAlgorithm: CANONICALIZATION,
      getKeyInfoContent: () => this.buildSiiKeyInfo(material),
    });
    sig.addReference({
      xpath: targetXpath,
      transforms,
      digestAlgorithm: DIGEST_METHOD,
      uri: referenceUri,
      isEmptyUri: referenceUri === '',
    });
    const locationRef = options.appendInsideTarget
      ? targetXpath
      : (options.signatureParentXPath ?? targetXpath);
    sig.computeSignature(unsignedXml, {
      location: { reference: locationRef, action: 'append' },
    });
    return sig.getSignedXml();
  }

  private buildSiiKeyInfo(material: PfxMaterial): string {
    const certB64 = this.chunk64(material.certificateDer.toString('base64'));
    return `<KeyValue><RSAKeyValue>${this.rsaKeyValueFromCertificate(material.certificatePem)}</RSAKeyValue></KeyValue><X509Data><X509Certificate>${certB64}</X509Certificate></X509Data>`;
  }

  /** Módulo/exponente como unsigned big-endian mínimo (sin 0x00 de signo de BigInteger). */
  private rsaBigIntToUnsignedBytes(bn: forge.jsbn.BigInteger): string {
    let hex = bn.toString(16);
    if (hex.length % 2 === 1) {
      hex = `0${hex}`;
    }
    return forge.util.hexToBytes(hex);
  }

  private rsaKeyValueFromCertificate(certificatePem: string): string {
    const cert = forge.pki.certificateFromPem(certificatePem);
    const pub = cert.publicKey as forge.pki.rsa.PublicKey;
    const n = forge.util.encode64(this.rsaBigIntToUnsignedBytes(pub.n));
    const e = forge.util.encode64(this.rsaBigIntToUnsignedBytes(pub.e));
    return `<Modulus>${this.chunk64(n)}</Modulus><Exponent>${this.chunk64(e)}</Exponent>`;
  }

  private chunk64(b64: string): string {
    return b64.match(/.{1,64}/g)?.join('\n') ?? b64;
  }

  parseSeed(xml: string): string {
    return extractSeedFromSemillaXml(xml);
  }
}
