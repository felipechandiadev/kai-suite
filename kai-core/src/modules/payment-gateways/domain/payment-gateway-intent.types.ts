export type PaymentGatewayChannel = 'POS_POINT' | 'ESHOP_CHECKOUT';

export type PaymentGatewayIntentStatus =
  | 'CREATED'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'CONSUMED';

export type PaymentGatewayIntentMetadata = {
  mpPreferenceId?: string | null;
  mpRaw?: Record<string, unknown>;
  authorizationCode?: string | null;
  paymentType?: string | null;
  cardLastFour?: string | null;
  statusDetail?: string | null;
  /** Split lógico venta+tip en un solo cobro Point (A1). */
  tipSplit?: boolean;
  tipAmount?: number | null;
  saleAmount?: number | null;
};

/**
 * Referencia para MP (Preferences / Orders).
 * Límite documentado: máx. 64 chars; patrón típico `[A-Za-z0-9_-]` (sin `:`).
 * El intentId UUID sin guiones es único; no hace falta embeber companyId.
 */
export function buildExternalReference(
  _companyId: string,
  channel: PaymentGatewayChannel,
  intentId: string,
): string {
  const ch = channel === 'POS_POINT' ? 'pos' : 'eshop';
  const id = intentId.replace(/-/g, '');
  return `ks_${ch}_${id}`.slice(0, 64);
}

/** Normaliza refs legacy (`ks:uuid:eshop:uuid`) antes de enviarlas a MP. */
export function sanitizeMpExternalReference(raw: string): string {
  const cleaned = (raw ?? '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 64);
  return cleaned.length > 0 ? cleaned : `ks_${Date.now()}`;
}

export function isMpCompatibleExternalReference(raw: string): boolean {
  return /^[a-zA-Z0-9_-]{1,64}$/.test((raw ?? '').trim());
}

export function mapMpPaymentStatus(
  status: string | undefined,
): PaymentGatewayIntentStatus {
  switch (status) {
    case 'approved':
    case 'processed':
      return 'APPROVED';
    case 'rejected':
    case 'cancelled':
    case 'canceled':
      return 'REJECTED';
    case 'in_process':
    case 'pending':
    case 'authorized':
    case 'processing':
    case 'action_required':
    case 'created':
      return 'PENDING';
    default:
      return 'PENDING';
  }
}

/** Estado del intent a partir de order + payment (API Orders). */
export function mapMpOrderToIntentStatus(input: {
  orderStatus?: string;
  orderStatusDetail?: string;
  paymentStatus?: string;
  paymentStatusDetail?: string;
}): PaymentGatewayIntentStatus {
  const payDetail = input.paymentStatusDetail?.toLowerCase();
  const orderDetail = input.orderStatusDetail?.toLowerCase();
  if (payDetail === 'accredited' || orderDetail === 'accredited') {
    return 'APPROVED';
  }

  const payStatus = input.paymentStatus?.toLowerCase();
  const orderStatus = input.orderStatus?.toLowerCase();

  if (payStatus === 'processed' || orderStatus === 'processed') {
    return 'APPROVED';
  }

  if (
    orderStatus === 'canceled' ||
    orderStatus === 'cancelled' ||
    payStatus === 'rejected' ||
    payStatus === 'cancelled' ||
    payStatus === 'canceled'
  ) {
    return 'REJECTED';
  }

  return mapMpPaymentStatus(payStatus ?? orderStatus);
}
