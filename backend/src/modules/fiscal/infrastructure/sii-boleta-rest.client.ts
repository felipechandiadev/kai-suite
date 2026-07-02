import { Injectable } from '@nestjs/common';
import * as https from 'node:https';
import { SiiEnvironment } from '../domain/fiscal.enums';
import { extractSiiAuthToken, extractEstadoFromEnvioStatusResponse, extractTrackIdFromEnvioResponse, splitRut } from './fiscal-xml.util';
import {
  buildEnvioBoletaMultipart,
  createMultipartBoundary,
} from './sii-boleta-multipart.util';

const SII_USER_AGENT = 'Mozilla/4.0 (compatible; PROG 1.0; Windows NT)';

@Injectable()
export class SiiBoletaRestClient {
  private apiBase(env: SiiEnvironment): string {
    return env === SiiEnvironment.PRODUCTION
      ? 'https://api.sii.cl/recursos/v1'
      : 'https://apicert.sii.cl/recursos/v1';
  }

  private envioBase(env: SiiEnvironment): string {
    return env === SiiEnvironment.PRODUCTION
      ? 'https://rahue.sii.cl/recursos/v1'
      : 'https://pangal.sii.cl/recursos/v1';
  }

  async getSemilla(env: SiiEnvironment): Promise<string> {
    const url = `${this.apiBase(env)}/boleta.electronica.semilla`;
    const res = await fetch(url, {
      headers: { Accept: 'application/xml' },
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`SII semilla error ${res.status}: ${text.slice(0, 200)}`);
    }
    return text;
  }

  async postToken(env: SiiEnvironment, signedXml: string): Promise<string> {
    const url = `${this.apiBase(env)}/boleta.electronica.token`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml',
        Accept: 'application/xml',
      },
      body: signedXml,
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`SII token error ${res.status}: ${text.slice(0, 200)}`);
    }
    return extractSiiAuthToken(res, text);
  }

  async postEnvioBoleta(
    env: SiiEnvironment,
    token: string,
    xmlPayload: string,
    companyRut: string,
    senderRut?: string,
  ): Promise<{ trackId: string; retryAfter?: string; raw: string }> {
    const url = `${this.envioBase(env)}/boleta.electronica.envio`;
    const boundary = createMultipartBoundary(xmlPayload);
    const multipart = buildEnvioBoletaMultipart(boundary, xmlPayload, companyRut, senderRut);
    const host = new URL(url).hostname;
    const { status, headers, body } = await this.postHttps(url, multipart, {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      Cookie: `TOKEN=${token.trim()}`,
      Accept: 'application/json, application/xml',
      'User-Agent': SII_USER_AGENT,
      Host: host,
    });
    const retryAfter = headers['x-retry-after'];
    if (status < 200 || status >= 300) {
      throw new Error(`SII envío error ${status}: ${body.slice(0, 400)}`);
    }
    const trackId = extractTrackIdFromEnvioResponse(body);
    if (!trackId) {
      throw new Error(`SII envío sin trackId: ${body.slice(0, 400)}`);
    }
    return { trackId, retryAfter, raw: body };
  }

  async getEnvioStatus(
    env: SiiEnvironment,
    token: string,
    rut: string,
    trackId: string,
  ): Promise<{ estado: string; raw: string }> {
    const { body, dv } = splitRut(rut);
    const url = `${this.apiBase(env)}/boleta.electronica.envio/${body}-${dv}-${trackId}`;
    const host = new URL(url).hostname;
    const { status, body: text } = await this.getHttps(url, {
      Cookie: `TOKEN=${token.trim()}`,
      Accept: 'application/json, application/xml',
      Host: host,
    });
    if (status < 200 || status >= 300) {
      throw new Error(`SII consulta error ${status}: ${text.slice(0, 200)}`);
    }
    const estado = extractEstadoFromEnvioStatusResponse(text);
    return { estado, raw: text };
  }

  private postHttps(
    url: string,
    body: Buffer,
    headers: Record<string, string>,
  ): Promise<{ status: number; headers: Record<string, string>; body: string }> {
    return this.requestHttps(url, 'POST', headers, body);
  }

  private getHttps(
    url: string,
    headers: Record<string, string>,
  ): Promise<{ status: number; headers: Record<string, string>; body: string }> {
    return this.requestHttps(url, 'GET', headers);
  }

  private requestHttps(
    url: string,
    method: 'GET' | 'POST',
    headers: Record<string, string>,
    body?: Buffer,
  ): Promise<{ status: number; headers: Record<string, string>; body: string }> {
    const parsed = new URL(url);
    return new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: parsed.hostname,
          port: 443,
          path: `${parsed.pathname}${parsed.search}`,
          method,
          headers: {
            ...headers,
            ...(body ? { 'Content-Length': body.length } : {}),
          },
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () => {
            const normalized: Record<string, string> = {};
            for (const [key, value] of Object.entries(res.headers)) {
              if (value == null) continue;
              normalized[key.toLowerCase()] = Array.isArray(value) ? value.join(', ') : value;
            }
            resolve({
              status: res.statusCode ?? 0,
              headers: normalized,
              body: Buffer.concat(chunks).toString('utf8'),
            });
          });
        },
      );
      req.on('error', reject);
      if (body) req.write(body);
      req.end();
    });
  }
}
