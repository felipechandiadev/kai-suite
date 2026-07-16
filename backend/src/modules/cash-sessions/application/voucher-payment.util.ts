import { BadRequestException } from '@nestjs/common';
import { PaymentMethod } from '@modules/transactions/domain/transaction.entity';
import type { CompanyVoucherKind } from '@modules/companies/domain/company-voucher-kinds.types';
import { activeCompanyVoucherKinds } from '@modules/companies/domain/company-voucher-kinds.types';
import type { CompanyPaymentMethodConfig } from '@modules/payment-methods-config';

export type VoucherPaymentLineInput = {
  paymentMethod?: string;
  amount?: number;
  reference?: string | null;
  companyPaymentMethodId?: string | null;
  voucherData?: {
    kindId?: string | null;
    kindCode?: string | null;
    kindName?: string | null;
    issuerName?: string | null;
    faceValue?: number | null;
    expiresAt?: string | null;
  } | null;
};

/**
 * Valida líneas VOUCHER:
 * - referencia (Nº) obligatoria
 * - kind resuelto vía companyPaymentMethodId → voucherKindId (preferido)
 *   o kindCode/kindId en voucherData
 * - FIXED: faceValue = default; amount ≤ faceValue
 * - OPEN: siempre exige faceValue; amount ≤ faceValue
 */
export function assertVoucherPaymentsValid(
  payments: VoucherPaymentLineInput[],
  voucherKinds: CompanyVoucherKind[],
  paymentCatalog: CompanyPaymentMethodConfig[] = [],
): void {
  const active = activeCompanyVoucherKinds(voucherKinds);
  const byCode = new Map(active.map((k) => [k.code, k]));
  const byId = new Map(active.map((k) => [k.id, k]));
  const catalogById = new Map(paymentCatalog.map((c) => [c.id, c]));

  for (const p of payments) {
    const method = String(p.paymentMethod ?? '')
      .trim()
      .toUpperCase();
    if (method !== PaymentMethod.VOUCHER) continue;

    const amount = Math.round(Number(p.amount) || 0);
    if (amount <= 0) {
      throw new BadRequestException(
        'El monto del voucher debe ser mayor que cero.',
      );
    }

    const reference = String(p.reference ?? '').trim();
    if (!reference) {
      throw new BadRequestException(
        'El número de voucher (referencia) es obligatorio.',
      );
    }

    let kind: CompanyVoucherKind | undefined;
    const cmpId = p.companyPaymentMethodId?.trim();
    if (cmpId) {
      const cmp = catalogById.get(cmpId);
      if (cmp?.voucherKindId) {
        kind = byId.get(cmp.voucherKindId);
      }
    }
    if (!kind && p.voucherData?.kindId) {
      kind = byId.get(String(p.voucherData.kindId).trim());
    }
    if (!kind) {
      const rawKind = String(p.voucherData?.kindCode ?? '')
        .trim()
        .toUpperCase();
      if (rawKind) kind = byCode.get(rawKind);
    }
    if (!kind) {
      throw new BadRequestException(
        'Tipo de voucher desconocido, inactivo o no enlazado al medio de pago.',
      );
    }

    const faceRaw = p.voucherData?.faceValue;
    const hasFace =
      faceRaw != null &&
      faceRaw !== ('' as unknown) &&
      Number.isFinite(Number(faceRaw));

    if (kind.faceValueMode === 'FIXED') {
      const fixed = Math.round(Number(kind.defaultFaceValue) || 0);
      if (fixed <= 0) {
        throw new BadRequestException(
          `El tipo de voucher ${kind.code} FIXED no tiene valor nominal configurado.`,
        );
      }
      const faceValue = hasFace ? Math.round(Number(faceRaw)) : fixed;
      if (amount > faceValue) {
        throw new BadRequestException(
          `El monto del voucher (${amount}) no puede superar el valor nominal (${faceValue}).`,
        );
      }
      continue;
    }

    // OPEN: valor nominal siempre obligatorio en venta
    if (!hasFace) {
      throw new BadRequestException(
        `El tipo de voucher ${kind.code} exige valor nominal (faceValue).`,
      );
    }
    const faceValue = Math.round(Number(faceRaw));
    if (faceValue <= 0) {
      throw new BadRequestException(
        'El valor nominal del voucher debe ser mayor que cero.',
      );
    }
    if (amount > faceValue) {
      throw new BadRequestException(
        `El monto del voucher (${amount}) no puede superar el valor nominal (${faceValue}).`,
      );
    }
  }
}
