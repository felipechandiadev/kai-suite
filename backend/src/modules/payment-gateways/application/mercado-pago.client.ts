import { BadRequestException, Injectable } from '@nestjs/common';
import type { MercadoPagoEnvironment } from '@modules/companies/domain/company-mercado-pago.types';

export type MpPaymentResponse = {
  id?: number | string;
  status?: string;
  status_detail?: string;
  external_reference?: string;
  authorization_code?: string;
  payment_type_id?: string;
  card?: { last_four_digits?: string };
};

@Injectable()
export class MercadoPagoClient {
  private baseUrl(environment: MercadoPagoEnvironment): string {
    return environment === 'production'
      ? 'https://api.mercadopago.com'
      : 'https://api.mercadopago.com';
  }

  private async request<T>(
    accessToken: string,
    environment: MercadoPagoEnvironment,
    path: string,
    init?: RequestInit,
  ): Promise<T> {
    const url = `${this.baseUrl(environment)}${path}`;
    const res = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
    const body = (await res.json().catch(() => ({}))) as T & {
      message?: string;
      cause?: Array<{ description?: string }>;
    };
    if (!res.ok) {
      const detail =
        body.message ??
        body.cause?.[0]?.description ??
        `Mercado Pago HTTP ${res.status}`;
      throw new BadRequestException(`Mercado Pago: ${detail}`);
    }
    return body;
  }

  async getPayment(
    accessToken: string,
    environment: MercadoPagoEnvironment,
    paymentId: string,
  ): Promise<MpPaymentResponse> {
    return this.request<MpPaymentResponse>(
      accessToken,
      environment,
      `/v1/payments/${paymentId}`,
      { method: 'GET' },
    );
  }

  async createCardPayment(input: {
    accessToken: string;
    environment: MercadoPagoEnvironment;
    amount: number;
    token: string;
    description: string;
    externalReference: string;
    payerEmail: string;
    idempotencyKey: string;
  }): Promise<MpPaymentResponse> {
    return this.request<MpPaymentResponse>(
      input.accessToken,
      input.environment,
      '/v1/payments',
      {
        method: 'POST',
        headers: { 'X-Idempotency-Key': input.idempotencyKey },
        body: JSON.stringify({
          transaction_amount: input.amount,
          token: input.token,
          description: input.description,
          installments: 1,
          payer: { email: input.payerEmail },
          external_reference: input.externalReference,
        }),
      },
    );
  }

  async createPointPaymentIntent(input: {
    accessToken: string;
    environment: MercadoPagoEnvironment;
    deviceId: string;
    amount: number;
    externalReference: string;
    description: string;
  }): Promise<{ id?: string; payment?: MpPaymentResponse }> {
    return this.request(
      input.accessToken,
      input.environment,
      `/point/integration-api/devices/${encodeURIComponent(input.deviceId)}/payment-intents`,
      {
        method: 'POST',
        body: JSON.stringify({
          amount: input.amount,
          description: input.description,
          additional_info: {
            external_reference: input.externalReference,
          },
        }),
      },
    );
  }

  async testConnection(
    accessToken: string,
    environment: MercadoPagoEnvironment,
  ): Promise<{ ok: true }> {
    await this.request<{ id?: number }>(
      accessToken,
      environment,
      '/users/me',
      { method: 'GET' },
    );
    return { ok: true };
  }
}
