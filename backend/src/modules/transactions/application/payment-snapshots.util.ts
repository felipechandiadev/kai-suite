import { PaymentMethod } from '../domain/transaction.entity';
import type { PaymentSnapshot } from '../domain/payment-snapshot.types';
import { normalizeVoucherPaymentData } from './voucher-payment-data.util';

export type SalePaymentInput = {
  paymentMethod: string;
  amount: number;
  companyPaymentMethodId?: string;
  bankAccountId?: string;
  reference?: string;
  checkData?: Record<string, unknown> | null;
  voucherData?: Record<string, unknown> | null;
};

export type CompanyPaymentMethodCatalogEntry = {
  id: string;
  method?: string;
  alias?: string | null;
  bankAccountKey?: string | null;
};

export function buildPaymentSnapshotsFromSalePayments(
  payments: SalePaymentInput[],
  catalog: CompanyPaymentMethodCatalogEntry[],
  capturedAt?: string,
): PaymentSnapshot[] {
  const now = capturedAt ?? new Date().toISOString();
  return payments
    .filter((p) => (Number(p.amount) || 0) > 0)
    .map((p) => {
      const cmpId = p.companyPaymentMethodId?.trim();
      const cmp = cmpId ? catalog.find((c) => c.id === cmpId) : undefined;
      const rawCheckData = p.checkData;
      const voucherData = normalizeVoucherPaymentData(p.voucherData);
      return {
        companyPaymentMethodId: cmp?.id ?? null,
        method: String(cmp?.method ?? p.paymentMethod ?? '').trim(),
        alias: cmp?.alias ?? null,
        bankAccountKey: cmp?.bankAccountKey ?? p.bankAccountId ?? null,
        amount: Number(p.amount) || 0,
        reference: p.reference?.trim() ?? null,
        capturedAt: now,
        checkData:
          rawCheckData && typeof rawCheckData === 'object' ? rawCheckData : null,
        voucherData,
      };
    });
}

export function getPaymentSnapshotsFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): PaymentSnapshot[] {
  if (!metadata || typeof metadata !== 'object') {
    return [];
  }
  const canonical = metadata.payments;
  if (Array.isArray(canonical) && canonical.length > 0) {
    return canonical
      .map(normalizePaymentSnapshot)
      .filter((s): s is PaymentSnapshot => s != null);
  }
  const legacySnapshots = metadata.paymentSnapshots;
  if (Array.isArray(legacySnapshots) && legacySnapshots.length > 0) {
    return legacySnapshots
      .map(normalizePaymentSnapshot)
      .filter((s): s is PaymentSnapshot => s != null);
  }
  const singular = metadata.paymentSnapshot;
  if (singular && typeof singular === 'object') {
    const one = normalizePaymentSnapshot(singular);
    return one ? [one] : [];
  }
  const legacyDetails = metadata.paymentDetails;
  if (Array.isArray(legacyDetails) && legacyDetails.length > 0) {
    const capturedAt = new Date().toISOString();
    return legacyDetails
      .map((d) => {
        if (!d || typeof d !== 'object') return null;
        const o = d as Record<string, unknown>;
        const method = String(o.paymentMethod ?? '').trim();
        const amount = Number(o.amount) || 0;
        if (!method || amount <= 0) return null;
        return normalizePaymentSnapshot({
          companyPaymentMethodId: o.companyPaymentMethodId ?? null,
          method,
          alias: null,
          bankAccountKey: o.bankAccountId ?? null,
          amount,
          reference: o.reference ?? null,
          capturedAt,
          checkData: o.checkData ?? null,
          voucherData: o.voucherData ?? null,
        });
      })
      .filter((s): s is PaymentSnapshot => s != null);
  }
  return [];
}

export function getPaymentSnapshots(
  source:
    | { metadata?: Record<string, unknown> | null }
    | Record<string, unknown>
    | null
    | undefined,
): PaymentSnapshot[] {
  if (!source) return [];
  if ('metadata' in source && source.metadata != null) {
    return getPaymentSnapshotsFromMetadata(
      source.metadata as Record<string, unknown>,
    );
  }
  return getPaymentSnapshotsFromMetadata(source as Record<string, unknown>);
}

export function isMultiPayment(snapshots: PaymentSnapshot[]): boolean {
  return snapshots.length > 1;
}

export function getRepresentativePaymentMethod(
  snapshots: PaymentSnapshot[],
  fallback: PaymentMethod | string = PaymentMethod.CASH,
): PaymentMethod {
  if (snapshots.length === 0) {
    return fallback as PaymentMethod;
  }
  const sorted = [...snapshots].sort(
    (a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0),
  );
  const method = String(sorted[0]?.method ?? '').trim();
  if (method && Object.values(PaymentMethod).includes(method as PaymentMethod)) {
    return method as PaymentMethod;
  }
  return fallback as PaymentMethod;
}

export function buildPaymentsMetadataFields(
  snapshots: PaymentSnapshot[],
): Record<string, unknown> {
  if (snapshots.length === 0) {
    return {};
  }
  return {
    payments: snapshots,
    paymentSnapshots: snapshots,
  };
}

function normalizePaymentSnapshot(raw: unknown): PaymentSnapshot | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const method = String(o.method ?? '').trim();
  const amount = Number(o.amount) || 0;
  if (!method) return null;
  return {
    companyPaymentMethodId:
      o.companyPaymentMethodId != null ? String(o.companyPaymentMethodId) : null,
    method,
    alias: typeof o.alias === 'string' ? o.alias : null,
    bankAccountKey:
      typeof o.bankAccountKey === 'string' ? o.bankAccountKey : null,
    amount,
    reference: typeof o.reference === 'string' ? o.reference : null,
    capturedAt:
      typeof o.capturedAt === 'string' && o.capturedAt.trim()
        ? o.capturedAt.trim()
        : new Date().toISOString(),
    checkData:
      o.checkData && typeof o.checkData === 'object'
        ? (o.checkData as Record<string, unknown>)
        : null,
    voucherData: normalizeVoucherPaymentData(
      o.voucherData as Record<string, unknown> | null | undefined,
    ),
  };
}
