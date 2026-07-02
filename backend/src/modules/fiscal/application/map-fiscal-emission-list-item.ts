import type { Transaction } from '@modules/transactions/domain/transaction.entity';
import type { FiscalDteEmission } from '../domain/fiscal-dte-emission.entity';
import { FiscalDteEmissionStatus } from '../domain/fiscal.enums';
import type { FiscalEmissionListItem } from './fiscal.types';
import { buildSiiRejectionMessage, resolveSiiEnvioStatus } from './sii-envio-status.util';

export type FiscalEmissionListJoinRow = {
  emission: FiscalDteEmission;
  transaction?: Transaction | null;
  branchName?: string | null;
};

function emissionErrorMessage(errorDetail: Record<string, unknown> | null | undefined): string | null {
  if (errorDetail && typeof errorDetail.message === 'string' && errorDetail.message.trim()) {
    return errorDetail.message.slice(0, 500);
  }
  const raw = errorDetail?.siiStatusRaw;
  if (typeof raw === 'string' && raw.trim()) {
    const resolved = resolveSiiEnvioStatus(raw);
    if (resolved.rejectionMessage) return resolved.rejectionMessage.slice(0, 500);
    if (resolved.envioStatus === FiscalDteEmissionStatus.RCH) {
      return buildSiiRejectionMessage(raw, resolved.estado)?.slice(0, 500) ?? null;
    }
  }
  return null;
}

export function mapFiscalEmissionListItem(row: FiscalEmissionListJoinRow): FiscalEmissionListItem {
  const { emission: e, transaction: tx, branchName } = row;
  const err = emissionErrorMessage(e.errorDetail);
  return {
    id: e.id,
    folio: e.folio,
    issuedAt: e.issuedAt,
    environment: e.environment,
    envioStatus: e.envioStatus,
    trackId: e.trackId ?? null,
    transactionId: e.transactionId,
    documentNumber: tx?.documentNumber ?? null,
    documentFolio: tx?.documentFolio ?? null,
    mntTotal: Math.round(Number(tx?.total) || 0),
    subtotal: Math.round(Number(tx?.subtotal) || 0),
    taxAmount: Math.round(Number(tx?.taxAmount) || 0),
    discountAmount: Math.round(Number(tx?.discountAmount) || 0),
    paymentMethod: tx?.paymentMethod ?? null,
    transactionCreatedAt: tx?.createdAt ? tx.createdAt.toISOString() : null,
    branchName: branchName?.trim() || null,
    receptorRut: e.receptorRut,
    receptorName: e.receptorName,
    errorMessage: err,
    hasTed: Boolean(e.tedXml?.trim()),
    updatedAt: e.updatedAt.toISOString(),
  };
}
