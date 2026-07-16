import { makePaymentLineId } from "@/features/pos-cart/pos-payment.utils";
import type { PosPaymentLine, PosPaymentMethodId } from "@/features/pos-cart/pos-payment.types";
import { isImmediateReturnRefundAllowedPaymentMethod } from "@/features/pos-cart/pos-payment.types";
import type { LoadedBackorderMeta } from "@/features/pos-cart/types/pos-cart-mode.types";
import type { EffectivePaymentMethod } from "@/features/pos-payment-methods/types/effective-payment-method.types";

const DEFAULT_CASH_SIGNATURE = "__DEFAULT_CASH__";

function hasCheckData(checkData: NonNullable<PosPaymentLine["checkData"]>): boolean {
  return Boolean(
    checkData.checkNumber?.trim() ||
      checkData.bankName?.trim() ||
      checkData.drawerName?.trim() ||
      checkData.drawerDocument?.trim() ||
      checkData.issueDate?.trim() ||
      checkData.dueDate?.trim(),
  );
}

export function isOnlyDefaultCashFallback(payments: PosPaymentLine[]): boolean {
  return (
    payments.length === 1 &&
    payments[0].type === "CASH" &&
    !payments[0].companyPaymentMethodId &&
    (Number(payments[0].amount) || 0) === 0 &&
    !payments[0].reference?.trim()
  );
}

export function isUntouchedPreloadPaymentLine(payment: PosPaymentLine): boolean {
  if (payment.creditNoteTransactionId || payment.backorderTransactionId) return false;
  if (payment.type === "INTERNAL_CREDIT" || payment.type === "CUSTOMER_CREDIT_NOTE") return false;
  if (payment.paymentGatewayIntentId) return false;
  if (payment.reference?.trim()) return false;
  if (payment.bankAccountKey?.trim()) return false;
  if (payment.internalCreditPlan) return false;
  if (payment.checkData && hasCheckData(payment.checkData)) return false;
  if (payment.voucherData?.expiresAt?.trim()) return false;

  const amount = Number(payment.amount) || 0;
  if (amount > 0 && payment.type !== "VOUCHER") return false;
  if (amount > 0 && payment.type === "VOUCHER" && payment.voucherData?.faceValue == null) {
    return false;
  }

  return true;
}

export function buildPreloadSignature(
  effectiveMethods: EffectivePaymentMethod[],
  cashOutRefundOnly: boolean,
): string {
  const preload = effectiveMethods.filter((method) => {
    if (!method.preloadOnPaymentScreen) return false;
    if (cashOutRefundOnly && !isImmediateReturnRefundAllowedPaymentMethod(method.method)) {
      return false;
    }
    return true;
  });

  if (preload.length === 0) return DEFAULT_CASH_SIGNATURE;

  return preload
    .map((method) => method.companyPaymentMethodId)
    .sort()
    .join(",");
}

export function buildPaymentsPreloadSignature(payments: PosPaymentLine[]): string {
  const templateLines = payments.filter(
    (payment) => payment.type !== "ORDER_ADVANCE" || !payment.backorderTransactionId,
  );

  if (templateLines.length === 0) return DEFAULT_CASH_SIGNATURE;
  if (isOnlyDefaultCashFallback(templateLines)) return DEFAULT_CASH_SIGNATURE;

  return templateLines
    .map((payment) => payment.companyPaymentMethodId ?? payment.type)
    .sort()
    .join(",");
}

export function shouldReapplyPaymentPreload(
  payments: PosPaymentLine[],
  effectiveMethods: EffectivePaymentMethod[],
  cashOutRefundOnly: boolean,
): boolean {
  if (payments.length === 0) return true;
  if (isOnlyDefaultCashFallback(payments)) return true;

  const templateLines = payments.filter(
    (payment) => payment.type !== "ORDER_ADVANCE" || !payment.backorderTransactionId,
  );
  if (templateLines.length === 0) return true;
  if (!templateLines.every(isUntouchedPreloadPaymentLine)) return false;

  return (
    buildPaymentsPreloadSignature(templateLines) !==
    buildPreloadSignature(effectiveMethods, cashOutRefundOnly)
  );
}

export type BuildPreloadPaymentLinesInput = {
  effectiveMethods: EffectivePaymentMethod[];
  cashOutRefundOnly: boolean;
  isFulfillBackorderMode: boolean;
  loadedBackorder: LoadedBackorderMeta | null;
  amountToPay: number;
  makeId?: () => string;
};

export function buildPreloadPaymentLines({
  effectiveMethods,
  cashOutRefundOnly,
  isFulfillBackorderMode,
  loadedBackorder,
  amountToPay,
  makeId = makePaymentLineId,
}: BuildPreloadPaymentLinesInput): PosPaymentLine[] {
  const preload = effectiveMethods.filter((method) => {
    if (!method.preloadOnPaymentScreen) return false;
    if (cashOutRefundOnly && !isImmediateReturnRefundAllowedPaymentMethod(method.method)) {
      return false;
    }
    return true;
  });

  const preloadLines: PosPaymentLine[] =
    preload.length > 0
      ? preload.map((method) => {
          const line: PosPaymentLine = {
            id: makeId(),
            type: method.method as PosPaymentMethodId,
            amount: 0,
            reference: "",
            companyPaymentMethodId: method.companyPaymentMethodId,
          };
          if (method.method === "VOUCHER") {
            const kind = method.voucherKind;
            const face =
              kind?.faceValueMode === "FIXED" && kind.defaultFaceValue != null
                ? Math.round(Number(kind.defaultFaceValue))
                : null;
            line.voucherData = {
              kindId: kind?.id,
              kindCode: kind?.code ?? "",
              kindName: kind?.name,
              issuerName: kind?.defaultIssuerName?.trim() || undefined,
              faceValue: face,
            };
            if (face != null && face > 0) {
              line.amount = face;
            }
          }
          return line;
        })
      : [
          {
            id: makeId(),
            type: "CASH",
            amount: 0,
            reference: "",
            companyPaymentMethodId: null,
          },
        ];

  if (isFulfillBackorderMode && loadedBackorder) {
    const advance = Math.min(
      Math.round(loadedBackorder.depositAvailable),
      Math.round(amountToPay),
    );
    if (advance > 0) {
      return [
        {
          id: makeId(),
          type: "ORDER_ADVANCE",
          amount: advance,
          reference: loadedBackorder.documentNumber,
          backorderTransactionId: loadedBackorder.id,
        },
        ...preloadLines,
      ];
    }
  }

  return preloadLines;
}
