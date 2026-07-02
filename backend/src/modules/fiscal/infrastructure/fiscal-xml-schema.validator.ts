import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as libxmljs from 'libxmljs2';

export type FiscalXmlSchemaValidationResult = {
  valid: boolean;
  errors: string[];
};

@Injectable()
export class FiscalXmlSchemaValidator implements OnModuleInit {
  private readonly logger = new Logger(FiscalXmlSchemaValidator.name);
  private envioBoletaXsd: libxmljs.Document | null = null;

  onModuleInit(): void {
    this.loadEnvioBoletaSchema();
  }

  private xsdDirectory(): string {
    return path.join(process.cwd(), 'vendor/sii/xsd');
  }

  private loadEnvioBoletaSchema(): void {
    const xsdDir = this.xsdDirectory();
    const xsdPath = path.join(xsdDir, 'EnvioBOLETA_v11.xsd');
    if (!fs.existsSync(xsdPath)) {
      this.logger.warn(`XSD no encontrado en ${xsdPath}; validación schema deshabilitada`);
      return;
    }
    const xsdContent = fs.readFileSync(xsdPath, 'utf8');
    this.envioBoletaXsd = libxmljs.parseXml(xsdContent, { baseUrl: `${xsdDir}/` });
  }

  validateEnvioBoletaXml(xml: string): FiscalXmlSchemaValidationResult {
    if (!this.envioBoletaXsd) {
      return { valid: false, errors: ['Schema EnvioBOLETA_v11.xsd no cargado'] };
    }
    const structural = this.validateEnvioBoletaStructure(xml);
    if (!structural.valid) {
      return structural;
    }
    try {
      const doc = libxmljs.parseXml(xml);
      const valid = doc.validate(this.envioBoletaXsd);
      if (valid) {
        return { valid: true, errors: [] };
      }
      const errors = (doc.validationErrors ?? []).map((e) => e.message).filter(Boolean);
      return {
        valid: errors.length === 0,
        errors: errors.length ? errors : ['XML no cumple EnvioBOLETA_v11.xsd'],
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return { valid: false, errors: [message] };
    }
  }

  private validateEnvioBoletaStructure(xml: string): FiscalXmlSchemaValidationResult {
    const errors: string[] = [];
    if (!xml.includes('<EnvioBOLETA')) {
      errors.push('Raíz EnvioBOLETA ausente');
    }
    if (!xml.includes('encoding="ISO-8859-1"')) {
      errors.push('Declaración XML debe usar encoding ISO-8859-1');
    }
    if (!/<SetDTE[^>]*ID="SetDoc"/.test(xml)) {
      errors.push('SetDTE con ID SetDoc ausente');
    }
    if (!/<\/Documento>\s*<Signature xmlns="http:\/\/www.w3.org\/2000\/09\/xmldsig#">[\s\S]*<\/DTE>/.test(xml)) {
      errors.push('Signature del DTE debe quedar en DTE tras cerrar Documento');
    }
    if (/<Documento[^>]*ID="F\d+T39"[\s\S]*<Signature xmlns="http:\/\/www.w3.org\/2000\/09\/xmldsig#">[\s\S]*<\/Documento>/.test(xml)) {
      errors.push('Signature del DTE no debe estar dentro de Documento (LSX-00204)');
    }
    try {
      libxmljs.parseXml(xml);
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
    return { valid: errors.length === 0, errors };
  }

  /** RCO no tiene XSD versionado; validación estructural mínima pre-envío. */
  validateRcoXml(xml: string): FiscalXmlSchemaValidationResult {
    const errors: string[] = [];
    if (!xml.includes('<ConsumoFolios')) {
      errors.push('Raíz ConsumoFolios ausente');
    }
    if (!/<DocumentoConsumoFolios[^>]*ID="RCO_/.test(xml)) {
      errors.push('DocumentoConsumoFolios con ID RCO_{from}_{to} ausente');
    }
    if (!/<DocumentoConsumoFolios[\s\S]*<Signature xmlns="http:\/\/www.w3.org\/2000\/09\/xmldsig#">/.test(xml)) {
      errors.push('Signature debe estar dentro de DocumentoConsumoFolios');
    }
    if (/<\/DocumentoConsumoFolios>\s*<Signature/.test(xml)) {
      errors.push('Signature fuera de DocumentoConsumoFolios');
    }
    try {
      libxmljs.parseXml(xml);
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
    return { valid: errors.length === 0, errors };
  }
}
