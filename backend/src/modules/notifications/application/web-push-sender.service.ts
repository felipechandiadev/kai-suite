import { Injectable, Logger } from '@nestjs/common';
import * as webpush from 'web-push';
import type { WebPushClientApp } from '../domain/web-push-subscription.entity';
import { WebPushSubscriptionService } from './web-push-subscription.service';

export type WebPushPayload = {
  title: string;
  body?: string | null;
  data?: Record<string, unknown>;
};

@Injectable()
export class WebPushSenderService {
  private readonly logger = new Logger(WebPushSenderService.name);
  private configured = false;

  constructor(private readonly subscriptions: WebPushSubscriptionService) {
    const publicKey = process.env.VAPID_PUBLIC_KEY?.trim() ?? '';
    const privateKey = process.env.VAPID_PRIVATE_KEY?.trim() ?? '';
    const subject =
      process.env.VAPID_SUBJECT?.trim() || 'mailto:ops@kai.local';
    if (publicKey && privateKey) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      this.configured = true;
    } else {
      this.logger.warn(
        'VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY no configurados; Web Push deshabilitado.',
      );
    }
  }

  isEnabled(): boolean {
    return this.configured;
  }

  getPublicKey(): string | null {
    const key = process.env.VAPID_PUBLIC_KEY?.trim() ?? '';
    return key || null;
  }

  async sendToUser(params: {
    userId: string;
    companyId: string;
    clientApp: WebPushClientApp;
    payload: WebPushPayload;
  }): Promise<void> {
    this.ensureConfigured();
    if (!this.configured) {
      this.logger.debug(
        `Web Push skip (VAPID off) user=${params.userId} app=${params.clientApp}`,
      );
      return;
    }
    const rows = await this.subscriptions.listForUser({
      userId: params.userId,
      companyId: params.companyId,
      clientApp: params.clientApp,
    });
    if (rows.length === 0) {
      this.logger.warn(
        `Web Push sin suscripciones user=${params.userId} company=${params.companyId} app=${params.clientApp}`,
      );
      return;
    }
    await this.sendToSubscriptions(rows, params.payload);
  }

  async sendToCompanyClient(params: {
    companyId: string;
    clientApp: WebPushClientApp;
    productionUnitIds?: Array<string | null | undefined>;
    payload: WebPushPayload;
  }): Promise<void> {
    this.ensureConfigured();
    if (!this.configured) {
      this.logger.debug(
        `Web Push skip (VAPID off) company=${params.companyId} app=${params.clientApp}`,
      );
      return;
    }
    const rows = await this.subscriptions.listForCompanyClient({
      companyId: params.companyId,
      clientApp: params.clientApp,
    });
    const unitFilter = [
      ...new Set(
        (params.productionUnitIds ?? [])
          .map((id) => (id != null ? String(id).trim() : ''))
          .filter(Boolean),
      ),
    ];
    const filtered =
      unitFilter.length === 0
        ? rows
        : rows.filter((row) => {
            if (!row.productionUnitId) return true;
            return unitFilter.includes(row.productionUnitId);
          });
    if (filtered.length === 0) {
      this.logger.warn(
        `Web Push sin suscripciones company=${params.companyId} app=${params.clientApp}`,
      );
      return;
    }
    await this.sendToSubscriptions(filtered, params.payload);
  }

  /** Relee VAPID del env si al arrancar no estaba (p. ej. sync posterior sin restart). */
  private ensureConfigured(): void {
    if (this.configured) return;
    const publicKey = process.env.VAPID_PUBLIC_KEY?.trim() ?? '';
    const privateKey = process.env.VAPID_PRIVATE_KEY?.trim() ?? '';
    const subject =
      process.env.VAPID_SUBJECT?.trim() || 'mailto:ops@kai.local';
    if (!publicKey || !privateKey) return;
    webpush.setVapidDetails(subject, publicKey, privateKey);
    this.configured = true;
    this.logger.log('Web Push VAPID configurado (lazy).');
  }

  private async sendToSubscriptions(
    rows: Array<{
      id: string;
      endpoint: string;
      p256dh: string;
      auth: string;
    }>,
    payload: WebPushPayload,
  ): Promise<void> {
    if (rows.length === 0) return;
    const body = JSON.stringify({
      title: payload.title,
      body: payload.body ?? '',
      data: payload.data ?? {},
    });

    await Promise.all(
      rows.map(async (row) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: row.endpoint,
              keys: { p256dh: row.p256dh, auth: row.auth },
            },
            body,
          );
        } catch (err: unknown) {
          const statusCode =
            err && typeof err === 'object' && 'statusCode' in err
              ? Number((err as { statusCode?: number }).statusCode)
              : undefined;
          if (statusCode === 404 || statusCode === 410) {
            await this.subscriptions.removeByEndpoint(row.endpoint);
            return;
          }
          this.logger.warn(
            `Web Push failed endpoint=${row.endpoint.slice(0, 48)}…: ${
              err instanceof Error ? err.message : String(err)
            }`,
          );
        }
      }),
    );
  }
}
