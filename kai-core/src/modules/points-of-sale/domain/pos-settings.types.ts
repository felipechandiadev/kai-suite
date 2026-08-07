export type PosKind = 'PRESALE' | 'SALE';

export interface PosSettings {
  paymentMethods?: unknown[];
  kind?: PosKind;
  acceptsPresaleTickets?: boolean;
  allowsDeferredPayment?: boolean;
  /** Módulo salón/KDS en este POS (default ON). Solo aplica si la empresa es KaiFood. */
  kaiFoodEnabled?: boolean;
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

/** Valor crudo en settings (default ON si no está definido). */
export function readKaiFoodEnabledSetting(settings: unknown): boolean {
  const s = (settings ?? {}) as PosSettings;
  if (s.kaiFoodEnabled === false) return false;
  return true;
}

/** KaiFood efectivo en este POS: empresa KaiFood y setting distinto de false. */
export function resolveKaiFoodEnabled(
  companyKaiProduct: string | null | undefined,
  posSettings: unknown,
): boolean {
  const product = (companyKaiProduct ?? '').trim().toLowerCase();
  if (product !== 'kaifood') return false;
  return readKaiFoodEnabledSetting(posSettings);
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
  if (patch.kaiFoodEnabled !== undefined) {
    base.kaiFoodEnabled = truthy(patch.kaiFoodEnabled);
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
