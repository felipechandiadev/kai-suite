import { createHmac, timingSafeEqual } from 'crypto';

function parseXSignature(xSignature: string): { ts: string | null; v1: string | null } {
  let ts: string | null = null;
  let v1: string | null = null;
  for (const part of xSignature.split(',')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    const val = part.slice(eq + 1).trim();
    if (key === 'ts') ts = val;
    if (key === 'v1') v1 = val;
  }
  return { ts, v1 };
}

function buildSignatureManifest(input: {
  dataId: string;
  xRequestId: string;
  ts: string;
}): string {
  const parts: string[] = [];
  if (input.dataId) parts.push(`id:${input.dataId}`);
  if (input.xRequestId) parts.push(`request-id:${input.xRequestId}`);
  parts.push(`ts:${input.ts}`);
  return `${parts.join(';')};`;
}

/** Valida firma HMAC de webhooks MP (tópico order / payment). */
export function validateMercadoPagoWebhookSignature(input: {
  xSignature: string;
  xRequestId: string;
  dataId: string;
  secret: string;
}): boolean {
  const secret = input.secret?.trim();
  if (!secret) return false;

  const { ts, v1 } = parseXSignature(input.xSignature ?? '');
  if (!ts || !v1) return false;

  const dataId = (input.dataId ?? '').toLowerCase();
  const manifest = buildSignatureManifest({
    dataId,
    xRequestId: input.xRequestId ?? '',
    ts,
  });

  const computed = createHmac('sha256', secret).update(manifest).digest('hex');
  try {
    return timingSafeEqual(Buffer.from(computed), Buffer.from(v1));
  } catch {
    return false;
  }
}
