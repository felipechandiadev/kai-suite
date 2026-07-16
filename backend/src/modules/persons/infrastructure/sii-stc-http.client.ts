import { Injectable, Logger } from '@nestjs/common';
import { formatRutBodyDvForSii } from './chile-rut.util';
import { parseSiiStcHtml, type ParsedSiiStcResult } from './sii-stc-html.parser';

const CAPTCHA_URL = 'https://zeus.sii.cl/cvc_cgi/stc/CViewCaptcha.cgi';
const LOOKUP_URL = 'https://zeus.sii.cl/cvc_cgi/stc/getstc';
const SII_USER_AGENT =
  'Mozilla/5.0 (compatible; KaiPlatform/1.0; +https://kaistore.cl)';

type CaptchaPayload = {
  txtCaptcha: string;
};

@Injectable()
export class SiiStcHttpClient {
  private readonly logger = new Logger(SiiStcHttpClient.name);

  private decodeCaptchaCode(txtCaptcha: string): string {
    const buf = Buffer.from(txtCaptcha, 'base64');
    return buf.subarray(36, 40).toString('utf8');
  }

  private async fetchCaptcha(): Promise<{ code: string; captcha: string }> {
    const body = new URLSearchParams({ oper: '0' });
    const res = await fetch(CAPTCHA_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': SII_USER_AGENT,
      },
      body,
    });
    if (!res.ok) {
      throw new Error(`SII captcha HTTP ${res.status}`);
    }
    const data = (await res.json()) as CaptchaPayload;
    if (!data.txtCaptcha) {
      throw new Error('SII captcha sin txtCaptcha');
    }
    return {
      code: this.decodeCaptchaCode(data.txtCaptcha),
      captcha: data.txtCaptcha,
    };
  }

  async lookupByRut(rutInput: string): Promise<ParsedSiiStcResult> {
    const { rut, dv } = formatRutBodyDvForSii(rutInput);
    const captcha = await this.fetchCaptcha();
    const form = new URLSearchParams({
      RUT: rut,
      DV: dv,
      PRG: 'STC',
      OPC: 'NOR',
      txt_code: captcha.code,
      txt_captcha: captcha.captcha,
    });

    const res = await fetch(LOOKUP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': SII_USER_AGENT,
      },
      body: form,
    });
    const html = await res.text();
    if (!res.ok) {
      this.logger.warn(`SII getstc HTTP ${res.status}`);
      throw new Error(`SII consulta falló (HTTP ${res.status})`);
    }
    return parseSiiStcHtml(html);
  }
}
