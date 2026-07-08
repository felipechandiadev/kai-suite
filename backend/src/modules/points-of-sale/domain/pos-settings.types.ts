export type PosKind = 'PRESALE' | 'SALE';

export interface PosSettings {
  paymentMethods?: unknown[];
  kind?: PosKind;
  acceptsPresaleTickets?: boolean;
  allowsDeferredPayment?: boolean;
  fiscal?: import('./pos-fiscal-settings.types').PosFiscalSettings;
}

const truthy = (v: unknown): boolean =>
  v === true || v === 1 || v === '1' || v === 'true';

export function readPosKind(settings: unknown): PosKind {
  const raw = (settings as PosSettings | null)?.kind;
  if (raw === 'PRESALE') return 'PRESALE';
  return 'SALE';
}

export function readAcceptsPresaleTickets(settings: unknown): boolean {
  const s = (settings ?? {}) as PosSettings;
  const kind = readPosKind(s);
  if (kind !== 'SALE') return false;
  return truthy(s.acceptsPresaleTickets);
}

export function readAllowsDeferredPayment(settings: unknown): boolean {
  const s = (settings ?? {}) as PosSettings;
  const kind = readPosKind(s);
  if (kind !== 'SALE') return false;
  return truthy(s.allowsDeferredPayment);
}

export function resolveDeferredPaymentEnabled(
  companyEnabled: boolean,
  posSettings: unknown,
): boolean {
  if (!companyEnabled) return false;
  return readPosKind(posSettings) === 'SALE' && readAllowsDeferredPayment(posSettings);
}

export function sanitizePosSettingsPatch(
  current: PosSettings | null | undefined,
  patch: Partial<PosSettings> | undefined,
): PosSettings {
  const base: PosSettings = { ...(current ?? {}) };
  if (!patch) return base;

  if (patch.kind === 'PRESALE' || patch.kind === 'SALE') {
    base.kind = patch.kind;
  }
  if (patch.acceptsPresaleTickets !== undefined) {
    base.acceptsPresaleTickets = truthy(patch.acceptsPresaleTickets);
  }
  if (patch.allowsDeferredPayment !== undefined) {
    base.allowsDeferredPayment = truthy(patch.allowsDeferredPayment);
  }
  if (base.kind === 'PRESALE') {
    base.acceptsPresaleTickets = false;
    base.allowsDeferredPayment = false;
  }
  if (base.kind === 'SALE' && base.acceptsPresaleTickets !== true) {
    base.acceptsPresaleTickets = Boolean(base.acceptsPresaleTickets);
  }
  if (base.kind === 'SALE' && base.allowsDeferredPayment !== true) {
    base.allowsDeferredPayment = Boolean(base.allowsDeferredPayment);
  }
  return base;
}
