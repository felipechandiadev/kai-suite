export type CashPaymentSourceResult =
  | { kind: 'hub'; cashHubId: string }
  | { kind: 'session'; cashSessionId: string }
  | { kind: 'invalid'; error: string }
  | { kind: 'missing' };

/**
 * Origen de efectivo por línea de pago de recepción:
 * - hub explícito (cashHubId sin cashSessionId en la línea) → centro, aunque el request traiga sesión POS
 * - sesión en línea o fallback al request → caja POS
 */
export function resolveCashPaymentSource(
  line: Record<string, unknown> | null | undefined,
  posCashSessionId?: string | null,
): CashPaymentSourceResult {
  const lineSession =
    typeof line?.cashSessionId === 'string' ? line.cashSessionId.trim() : '';
  const lineHub =
    typeof line?.cashHubId === 'string' ? line.cashHubId.trim() : '';
  if (lineHub && lineSession) {
    return {
      kind: 'invalid',
      error: 'efectivo no puede usar caja y centro de acopio a la vez.',
    };
  }
  if (lineHub) {
    return { kind: 'hub', cashHubId: lineHub };
  }
  const sessionId =
    lineSession ||
    (typeof posCashSessionId === 'string' ? posCashSessionId.trim() : '');
  if (sessionId) {
    return { kind: 'session', cashSessionId: sessionId };
  }
  return { kind: 'missing' };
}
