import { BadRequestException } from '@nestjs/common';
import type { EmisorData } from '../infrastructure/boleta-envio.builder';
import { buildEnvioBoletaXml } from '../infrastructure/boleta-envio.builder';
import type { FiscalXmlSchemaValidator } from '../infrastructure/fiscal-xml-schema.validator';
import type { SiiBoletaAuthService, PfxMaterial } from '../infrastructure/sii-boleta-auth.service';
import type { SiiBoletaRestClient } from '../infrastructure/sii-boleta-rest.client';
import { SiiEnvironment } from '../domain/fiscal.enums';

export class FiscalXmlSchemaValidationError extends BadRequestException {
  constructor(public readonly schemaErrors: string[]) {
    super(
      `XML no cumple schema SII EnvioBOLETA: ${(schemaErrors[0] ?? 'error desconocido').slice(0, 300)}`,
    );
  }
}

export function withIso8859Declaration(xml: string): string {
  return xml.replace(
    /^<\?xml[^>]*\?>\s*/i,
    '<?xml version="1.0" encoding="ISO-8859-1"?>\n',
  );
}

export function buildSignedEnvioBoleta(
  auth: SiiBoletaAuthService,
  emisor: EmisorData,
  signedDtes: string[],
  rutEnvia: string,
  material: PfxMaterial,
): string {
  const envio = buildEnvioBoletaXml(emisor, signedDtes, rutEnvia);
  return auth.signEnvioBoleta(envio, material);
}

export function assertEnvioBoletaSchema(
  validator: FiscalXmlSchemaValidator,
  signedXml: string,
): void {
  const result = validator.validateEnvioBoletaXml(signedXml);
  if (!result.valid) {
    throw new FiscalXmlSchemaValidationError(result.errors);
  }
}

export function assertRcoSchema(
  validator: FiscalXmlSchemaValidator,
  signedXml: string,
): void {
  const result = validator.validateRcoXml(signedXml);
  if (!result.valid) {
    throw new FiscalXmlSchemaValidationError(result.errors);
  }
}

export async function validateAndPostEnvioBoleta(
  validator: FiscalXmlSchemaValidator,
  sii: SiiBoletaRestClient,
  params: {
    environment: SiiEnvironment;
    token: string;
    signedXml: string;
    companyRut: string;
    rutEnvia: string;
    schemaKind?: 'envio' | 'rco';
  },
): Promise<{ trackId: string; retryAfter?: string; raw: string }> {
  if (params.schemaKind === 'rco') {
    assertRcoSchema(validator, params.signedXml);
  } else {
    assertEnvioBoletaSchema(validator, params.signedXml);
  }
  return sii.postEnvioBoleta(
    params.environment,
    params.token,
    params.signedXml,
    params.companyRut,
    params.rutEnvia,
  );
}
