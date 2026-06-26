import { validateMercadoPagoWebhookSignature } from '../application/mercado-pago-webhook-signature';

describe('mercado-pago-webhook-signature', () => {
  const secret = 'test-webhook-secret';

  it('validates HMAC per MP manifest template', () => {
    const dataId = 'ord01jq4s4ky8hwq6na5pxb65b3d3';
    const xRequestId = 'req-123';
    const ts = '1742505638683';
    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
    const crypto = require('crypto') as typeof import('crypto');
    const v1 = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
    const xSignature = `ts=${ts},v1=${v1}`;

    expect(
      validateMercadoPagoWebhookSignature({
        xSignature,
        xRequestId,
        dataId: 'ORD01JQ4S4KY8HWQ6NA5PXB65B3D3',
        secret,
      }),
    ).toBe(true);
  });

  it('rejects invalid signature', () => {
    expect(
      validateMercadoPagoWebhookSignature({
        xSignature: 'ts=1,v1=deadbeef',
        xRequestId: 'x',
        dataId: 'ord01',
        secret,
      }),
    ).toBe(false);
  });
});
