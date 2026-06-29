import { Injectable } from '@nestjs/common';
import { SiiEnvironment } from '../domain/fiscal.enums';
import { extractTokenFromResponseXml, splitRut } from './fiscal-xml.util';

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
    return extractTokenFromResponseXml(text);
  }

  async postEnvioBoleta(
    env: SiiEnvironment,
    token: string,
    xmlPayload: string,
    rut: string,
  ): Promise<{ trackId: string; retryAfter?: string; raw: string }> {
    const url = `${this.envioBase(env)}/boleta.electronica.envio`;
    const boundary = `----kai${Date.now()}`;
    const multipart = this.buildMultipart(boundary, xmlPayload, rut);
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        Cookie: `TOKEN=${token}`,
        Accept: 'application/xml',
        'User-Agent': 'Mozilla/4.0 (compatible; KAI-SII/1.0)',
      },
      body: new Uint8Array(multipart),
    });
    const text = await res.text();
    const retryAfter = res.headers.get('x-retry-after') ?? undefined;
    if (!res.ok) {
      throw new Error(`SII envío error ${res.status}: ${text.slice(0, 400)}`);
    }
    const trackId = this.extractTrackId(text);
    if (!trackId) {
      throw new Error(`SII envío sin trackId: ${text.slice(0, 400)}`);
    }
    return { trackId, retryAfter, raw: text };
  }

  async getEnvioStatus(
    env: SiiEnvironment,
    token: string,
    rut: string,
    trackId: string,
  ): Promise<{ estado: string; raw: string }> {
    const { body, dv } = splitRut(rut);
    const url = `${this.apiBase(env)}/boleta.electronica.envio/${body}-${dv}-${trackId}`;
    const res = await fetch(url, {
      headers: {
        Cookie: `TOKEN=${token}`,
        Accept: 'application/xml',
      },
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`SII consulta error ${res.status}: ${text.slice(0, 200)}`);
    }
    const estado = text.match(/<ESTADO>([^<]+)<\/ESTADO>/i)?.[1]?.trim() ?? 'UNKNOWN';
    return { estado, raw: text };
  }

  private buildMultipart(boundary: string, xml: string, rut: string): Buffer {
    const { body, dv } = splitRut(rut);
    const parts: string[] = [];
    parts.push(`--${boundary}`);
    parts.push(`Content-Disposition: form-data; name="rutCompany"`);
    parts.push('');
    parts.push(body);
    parts.push(`--${boundary}`);
    parts.push(`Content-Disposition: form-data; name="dvCompany"`);
    parts.push('');
    parts.push(dv);
    parts.push(`--${boundary}`);
    parts.push(
      `Content-Disposition: form-data; name="archivo"; filename="envio.xml"`,
    );
    parts.push('Content-Type: application/xml');
    parts.push('');
    parts.push(xml);
    parts.push(`--${boundary}--`);
    return Buffer.from(parts.join('\r\n'), 'utf8');
  }

  private extractTrackId(xml: string): string | null {
    const m =
      xml.match(/<TRACKID>([^<]+)<\/TRACKID>/i) ??
      xml.match(/<TRACK_ID>([^<]+)<\/TRACK_ID>/i);
    return m?.[1]?.trim() ?? null;
  }
}
