import { describe, expect, it } from "vitest";
import {
  agentPrintTypeMayOpenCashDrawer,
  shouldOpenCashDrawerForTicketJob,
} from "./cash-drawer-policy";

describe("cash-drawer-policy", () => {
  it("allows sale ticket when mapping enabled on 80mm", () => {
    expect(shouldOpenCashDrawerForTicketJob("pos-sale-ticket", 48, true)).toBe(true);
  });

  it("never opens for dining account ticket", () => {
    expect(agentPrintTypeMayOpenCashDrawer("pos-dining-account-ticket")).toBe(false);
    expect(
      shouldOpenCashDrawerForTicketJob("pos-dining-account-ticket", 48, true),
    ).toBe(false);
  });

  it("never opens for bank account ticket", () => {
    expect(agentPrintTypeMayOpenCashDrawer("pos-bank-account-ticket")).toBe(false);
    expect(
      shouldOpenCashDrawerForTicketJob("pos-bank-account-ticket", 48, true),
    ).toBe(false);
  });
});
