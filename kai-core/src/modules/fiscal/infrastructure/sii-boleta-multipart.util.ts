import * as crypto from 'node:crypto';
import { splitRut } from './fiscal-xml.util';

export function createMultipartBoundary(xml: string): string {
  let boundary: string;
  do {
    boundary = `----${crypto.randomBytes(16).toString('hex')}`;
  } while (xml.includes(boundary));
  return boundary;
}

export function buildEnvioBoletaMultipart(
  boundary: string,
  xml: string,
  companyRut: string,
  senderRut?: string,
): Buffer {
  const company = splitRut(companyRut);
  const sender = splitRut(senderRut ?? companyRut);
  const parts: string[] = [];
  parts.push(`--${boundary}`);
  parts.push(`Content-Disposition: form-data; name="rutSender"`);
  parts.push('');
  parts.push(sender.body);
  parts.push(`--${boundary}`);
  parts.push(`Content-Disposition: form-data; name="dvSender"`);
  parts.push('');
  parts.push(sender.dv);
  parts.push(`--${boundary}`);
  parts.push(`Content-Disposition: form-data; name="rutCompany"`);
  parts.push('');
  parts.push(company.body);
  parts.push(`--${boundary}`);
  parts.push(`Content-Disposition: form-data; name="dvCompany"`);
  parts.push('');
  parts.push(company.dv);
  parts.push(`--${boundary}`);
  parts.push(
    `Content-Disposition: form-data; name="archivo"; filename="envio.xml"`,
  );
  parts.push('Content-Type: application/octet-stream');
  parts.push('');
  parts.push(xml);
  parts.push(`--${boundary}--`);
  parts.push('');
  return Buffer.from(parts.join('\r\n'), 'latin1');
}

export function extractArchivoFromMultipart(buffer: Buffer, boundary: string): string {
  const text = buffer.toString('latin1');
  const archivoHeader = `name="archivo"`;
  const headerIdx = text.indexOf(archivoHeader);
  if (headerIdx < 0) {
    throw new Error('Parte archivo no encontrada en multipart');
  }
  const bodyStart = text.indexOf('\r\n\r\n', headerIdx);
  if (bodyStart < 0) {
    throw new Error('Cuerpo archivo no encontrado en multipart');
  }
  const xmlStart = bodyStart + 4;
  const closing = `\r\n--${boundary}--`;
  const xmlEnd = text.indexOf(closing, xmlStart);
  if (xmlEnd < 0) {
    throw new Error('Cierre multipart no encontrado');
  }
  return text.slice(xmlStart, xmlEnd);
}
