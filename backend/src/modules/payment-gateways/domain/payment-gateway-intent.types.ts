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
