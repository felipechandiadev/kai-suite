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

export type MpOrderPayment = {
  id?: string;
  amount?: string;
  paid_amount?: string;
  status?: string;
  status_detail?: string;
  reference_id?: string;
};

export type MpPreferenceResponse = {
  id?: string;
  init_point?: string;
  external_reference?: string;
};

export type MpOrderResponse = {
  id?: string;
  type?: string;
  status?: string;
  status_detail?: string;
  external_reference?: string;
  processing_mode?: string;
  capture_mode?: string;
  transactions?: {
    payments?: MpOrderPayment[] | MpOrderPayment;
  };
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

  async getOrder(
    accessToken: string,
    environment: MercadoPagoEnvironment,
    orderId: string,
  ): Promise<MpOrderResponse> {
    return this.request<MpOrderResponse>(
      accessToken,
      environment,
      `/v1/orders/${encodeURIComponent(orderId)}`,
      { method: 'GET' },
    );
  }

  async createCheckoutPreference(input: {
    accessToken: string;
    environment: MercadoPagoEnvironment;
    title: string;
    unitPrice: number;
    externalReference: string;
    payerEmail: string;
    notificationUrl?: string;
    backUrls?: {
      success: string;
      failure: string;
      pending: string;
    };
  }): Promise<MpPreferenceResponse> {
    const unitPrice = Math.round(input.unitPrice);
    const backUrls = input.backUrls;
    const useAutoReturn =
      backUrls?.success?.trim() &&
      backUrls?.failure?.trim() &&
      backUrls?.pending?.trim();

    return this.request<MpPreferenceResponse>(
      input.accessToken,
      input.environment,
      '/checkout/preferences',
      {
        method: 'POST',
        body: JSON.stringify({
          items: [
            {
              title: input.title,
              quantity: 1,
              unit_price: unitPrice,
              currency_id: 'CLP',
            },
          ],
          payer: { email: input.payerEmail.trim() },
          external_reference: input.externalReference,
          notification_url: input.notificationUrl || undefined,
          ...(useAutoReturn
            ? {
                back_urls: {
                  success: backUrls!.success,
                  failure: backUrls!.failure,
                  pending: backUrls!.pending,
                },
                auto_return: 'approved',
              }
            : {}),
        }),
      },
    );
  }

  async createOrder(input: {
    accessToken: string;
    environment: MercadoPagoEnvironment;
    totalAmount: number;
    externalReference: string;
    token: string;
    paymentMethodId: string;
    paymentMethodType: 'credit_card' | 'debit_card';
    installments: number;
    payerEmail: string;
    idempotencyKey: string;
    description?: string;
  }): Promise<MpOrderResponse> {
    const amount = String(Math.round(input.totalAmount));
    return this.request<MpOrderResponse>(
      input.accessToken,
      input.environment,
      '/v1/orders',
      {
        method: 'POST',
        headers: { 'X-Idempotency-Key': input.idempotencyKey },
        body: JSON.stringify({
          type: 'online',
          processing_mode: 'automatic',
          capture_mode: 'automatic',
          total_amount: amount,
          external_reference: input.externalReference,
          description: input.description ?? undefined,
          payer: { email: input.payerEmail.trim() },
          transactions: {
            payments: [
              {
                amount,
                payment_method: {
                  id: input.paymentMethodId,
                  type: input.paymentMethodType,
                  token: input.token,
                  installments: Math.max(1, input.installments),
                },
              },
            ],
          },
        }),
      },
    );
  }

  /** @deprecated Prefer createOrder for Checkout API Orders (eShop). */
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

export function extractMpOrderPayments(
  order: MpOrderResponse,
): MpOrderPayment[] {
  const raw = order.transactions?.payments;
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

export function primaryMpOrderPayment(order: MpOrderResponse): MpOrderPayment | null {
  const payments = extractMpOrderPayments(order);
  return payments[0] ?? null;
}
