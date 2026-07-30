import { Injectable, Logger } from '@nestjs/common';

export type KaiMailSendParams = {
  template: string;
  to: string;
  variables: Record<string, string>;
  idempotencyKey?: string;
  locale?: string;
  replyTo?: string;
};

@Injectable()
export class KaiMailClient {
  private readonly logger = new Logger(KaiMailClient.name);

  isEnabled(): boolean {
    return Boolean(process.env.KAI_MAIL_URL?.trim());
  }

  async sendOrderTemplate(params: KaiMailSendParams): Promise<void> {
    const baseUrl = process.env.KAI_MAIL_URL?.trim();
    if (!baseUrl) {
      return;
    }

    const apiKey = process.env.KAI_MAIL_API_KEY?.trim();
    const url = `${baseUrl.replace(/\/$/, '')}/v1/mail/send`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({
          template: params.template,
          to: params.to,
          locale: params.locale ?? 'es-CL',
          variables: params.variables,
          idempotencyKey: params.idempotencyKey,
          replyTo: params.replyTo,
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        this.logger.warn(`KAI Mail respondió ${res.status}: ${text}`);
      }
    } catch (err) {
      this.logger.warn('KAI Mail no disponible', err);
    } finally {
      clearTimeout(timeout);
    }
  }
}
