import {
  Installment,
  InstallmentSourceType,
  InstallmentStatus,
} from '@modules/installments/domain/installment.entity';

const COLLECTIBLE_STATUSES: InstallmentStatus[] = [
  InstallmentStatus.PENDING,
  InstallmentStatus.PARTIAL,
  InstallmentStatus.OVERDUE,
];

export function installmentPendingAmount(installment: Installment): number {
  return Math.max(
    0,
    Math.round(
      Number(installment.amount ?? 0) - Number(installment.amountPaid ?? 0),
    ),
  );
}

export function isInstallmentCollectible(installment: Installment): boolean {
  if (installment.sourceType !== InstallmentSourceType.SALE) return false;
  if (!COLLECTIBLE_STATUSES.includes(installment.status)) return false;
  return installmentPendingAmount(installment) > 0;
}

export function resolveInstallmentSaleId(installment: Installment): string | null {
  const fromSource = installment.sourceTransactionId?.trim();
  if (fromSource) return fromSource;
  const fromLegacy = installment.saleTransactionId?.trim();
  if (fromLegacy) return fromLegacy;
  const fromRelation = installment.saleTransaction?.id?.trim();
  return fromRelation || null;
}
