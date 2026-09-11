import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@kai-shared/storage-key-migrate", () => ({
  getMigratedLocalStorageItem: vi.fn(),
  setMigratedLocalStorageItem: vi.fn(),
}));

import {
  getMigratedLocalStorageItem,
  setMigratedLocalStorageItem,
} from "@kai-shared/storage-key-migrate";
import {
  POS_PAYMENT_CUSTOMER_PANEL_OPEN_LS_KEY,
  readPosPaymentCustomerPanelOpen,
  writePosPaymentCustomerPanelOpen,
} from "./pos-payment-customer-panel-storage";

describe("pos-payment-customer-panel-storage", () => {
  beforeEach(() => {
    vi.mocked(getMigratedLocalStorageItem).mockReset();
    vi.mocked(setMigratedLocalStorageItem).mockReset();
    vi.stubGlobal("window", {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("defaults to collapsed when unset", () => {
    vi.mocked(getMigratedLocalStorageItem).mockReturnValue(null);
    expect(readPosPaymentCustomerPanelOpen()).toBe(false);
  });

  it("reads open as true", () => {
    vi.mocked(getMigratedLocalStorageItem).mockReturnValue("1");
    expect(readPosPaymentCustomerPanelOpen()).toBe(true);
  });

  it("persists open/collapsed", () => {
    writePosPaymentCustomerPanelOpen(true);
    expect(setMigratedLocalStorageItem).toHaveBeenCalledWith(
      POS_PAYMENT_CUSTOMER_PANEL_OPEN_LS_KEY,
      POS_PAYMENT_CUSTOMER_PANEL_OPEN_LS_KEY,
      "1",
    );
    writePosPaymentCustomerPanelOpen(false);
    expect(setMigratedLocalStorageItem).toHaveBeenCalledWith(
      POS_PAYMENT_CUSTOMER_PANEL_OPEN_LS_KEY,
      POS_PAYMENT_CUSTOMER_PANEL_OPEN_LS_KEY,
      "0",
    );
  });
});
