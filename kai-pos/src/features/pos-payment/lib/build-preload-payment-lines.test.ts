import { describe, expect, it } from "vitest";
import type { PosPaymentLine } from "@/features/pos-cart/pos-payment.types";
import type { EffectivePaymentMethod } from "@/features/pos-payment-methods/types/effective-payment-method.types";
import {
  buildPreloadPaymentLines,
  buildPreloadSignature,
  isOnlyDefaultCashFallback,
  isUntouchedPreloadPaymentLine,
  shouldReapplyPaymentPreload,
} from "./build-preload-payment-lines";

const debitMethod: EffectivePaymentMethod = {
  companyPaymentMethodId: "cmp-debit",
  method: "DEBIT_CARD",
  label: "Débito",
  requireReference: false,
  preloadOnPaymentScreen: true,
  preloadOrder: 1,
  isDefaultForChange: false,
  displayOrder: 1,
};

const cashMethod: EffectivePaymentMethod = {
  companyPaymentMethodId: "cmp-cash",
  method: "CASH",
  label: "Efectivo",
  requireReference: false,
  preloadOnPaymentScreen: false,
  preloadOrder: null,
  isDefaultForChange: true,
  displayOrder: 0,
};

describe("build-preload-payment-lines", () => {
  it("detects default cash fallback from offline mode", () => {
    const payments: PosPaymentLine[] = [
      { id: "1", type: "CASH", amount: 0, reference: "" },
    ];
    expect(isOnlyDefaultCashFallback(payments)).toBe(true);
  });

  it("reapplies preload when persisted payments are stale vs POS config", () => {
    const stalePayments: PosPaymentLine[] = [
      {
        id: "1",
        type: "CASH",
        amount: 0,
        reference: "",
        companyPaymentMethodId: "cmp-cash",
      },
    ];
    expect(
      shouldReapplyPaymentPreload(stalePayments, [debitMethod, cashMethod], false),
    ).toBe(true);
  });

  it("does not replace payments the cashier already edited", () => {
    const editedPayments: PosPaymentLine[] = [
      {
        id: "1",
        type: "DEBIT_CARD",
        amount: 15000,
        reference: "",
        companyPaymentMethodId: "cmp-debit",
      },
    ];
    expect(
      shouldReapplyPaymentPreload(editedPayments, [debitMethod, cashMethod], false),
    ).toBe(false);
  });

  it("builds debit preload line from effective methods", () => {
    const lines = buildPreloadPaymentLines({
      effectiveMethods: [cashMethod, debitMethod],
      cashOutRefundOnly: false,
      isFulfillBackorderMode: false,
      loadedBackorder: null,
      amountToPay: 10000,
      makeId: () => "line-debit",
    });

    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      id: "line-debit",
      type: "DEBIT_CARD",
      amount: 0,
      companyPaymentMethodId: "cmp-debit",
    });
  });

  it("falls back to generic cash when no preload methods are configured", () => {
    const lines = buildPreloadPaymentLines({
      effectiveMethods: [cashMethod],
      cashOutRefundOnly: false,
      isFulfillBackorderMode: false,
      loadedBackorder: null,
      amountToPay: 5000,
      makeId: () => "line-cash",
    });

    expect(lines).toEqual([
      {
        id: "line-cash",
        type: "CASH",
        amount: 0,
        reference: "",
        companyPaymentMethodId: null,
      },
    ]);
    expect(buildPreloadSignature([cashMethod], false)).toBe("__DEFAULT_CASH__");
  });

  it("treats zero-amount voucher preload lines as untouched", () => {
    const payment: PosPaymentLine = {
      id: "1",
      type: "VOUCHER",
      amount: 0,
      reference: "",
      companyPaymentMethodId: "cmp-voucher",
      voucherData: {
        kindCode: "VK00001",
        kindName: "Gift card",
      },
    };
    expect(isUntouchedPreloadPaymentLine(payment)).toBe(true);
  });
});
