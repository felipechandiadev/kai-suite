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
  mpRaw?: Record<string, unknown>;
  authorizationCode?: string | null;
  paymentType?: string | null;
  cardLastFour?: string | null;
  statusDetail?: string | null;
};

export function buildExternalReference(
  companyId: string,
  channel: PaymentGatewayChannel,
  intentId: string,
): string {
  const shortChannel = channel === 'POS_POINT' ? 'pos_point' : 'eshop';
  return `ks:${companyId}:${shortChannel}:${intentId}`;
}

export function mapMpPaymentStatus(
  status: string | undefined,
): PaymentGatewayIntentStatus {
  switch (status) {
    case 'approved':
      return 'APPROVED';
    case 'rejected':
    case 'cancelled':
      return 'REJECTED';
    case 'in_process':
    case 'pending':
    case 'authorized':
      return 'PENDING';
    default:
      return 'PENDING';
  }
}
