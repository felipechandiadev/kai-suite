import { describe, expect, it } from "vitest";
import type { PosPaymentLine } from "@/features/pos-cart/pos-payment.types";
import type { EffectivePaymentMethod } from "@/features/pos-payment-methods/types/effective-payment-method.types";
import {
  showsPaymentReferenceField,
  validateConfiguredPaymentReference,
} from "./payment-reference-field.util";

const debitCfg: EffectivePaymentMethod = {
  companyPaymentMethodId: "cmp-debit",
  method: "DEBIT_CARD",
  label: "Débito",
  requireReference: false,
  preloadOnPaymentScreen: true,
  preloadOrder: 1,
  isDefaultForChange: false,
  displayOrder: 1,
};

const transferWithRef: EffectivePaymentMethod = {
  ...debitCfg,
  companyPaymentMethodId: "cmp-transfer",
  method: "TRANSFER",
  requireReference: true,
};

describe("payment-reference-field.util", () => {
  it("hides reference for debit when POS config does not require it", () => {
    expect(
      showsPaymentReferenceField(
        {
          type: "DEBIT_CARD",
          companyPaymentMethodId: "cmp-debit",
        },
        debitCfg,
      ),
    ).toBe(false);
  });

  it("shows reference when POS config requires it", () => {
    expect(
      showsPaymentReferenceField(
        {
          type: "TRANSFER",
          companyPaymentMethodId: "cmp-transfer",
        },
        transferWithRef,
      ),
    ).toBe(true);
  });

  it("validates missing reference only when configured as required", () => {
    const payment: PosPaymentLine = {
      id: "1",
      type: "TRANSFER",
      amount: 5000,
      reference: "",
      companyPaymentMethodId: "cmp-transfer",
    };
    expect(validateConfiguredPaymentReference(payment, transferWithRef)).toBe(
      "Ingresa la referencia del medio de pago.",
    );
    expect(validateConfiguredPaymentReference(payment, debitCfg)).toBeNull();
  });
});
