import { describe, expect, it } from "vitest";
import { buildCreateSalePayments } from "../lib/build-create-sale-payload";
import type { PosPaymentLine } from "@/features/pos-cart/pos-payment.types";

describe("buildCreateSalePayments", () => {
  it("serializes VOUCHER voucherData alongside CASH", () => {
    const payments: PosPaymentLine[] = [
      {
        id: "1",
        type: "CASH",
        amount: 3000,
        reference: "",
      },
      {
        id: "2",
        type: "VOUCHER",
        amount: 7000,
        reference: "VG-12",
        companyPaymentMethodId: "cmp-voucher",
        voucherData: {
          kindId: "kind-gas",
          kindCode: "VK00001",
          kindName: "Voucher gas",
          issuerName: "Empresa Gas",
          faceValue: 10000,
        },
      },
    ];
    const rows = buildCreateSalePayments(payments);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ paymentMethod: "CASH", amount: 3000 });
    expect(rows[1]).toMatchObject({
      paymentMethod: "VOUCHER",
      amount: 7000,
      reference: "VG-12",
      companyPaymentMethodId: "cmp-voucher",
      voucherData: {
        kindId: "kind-gas",
        kindCode: "VK00001",
        kindName: "Voucher gas",
        issuerName: "Empresa Gas",
        faceValue: 10000,
      },
    });
  });
});
