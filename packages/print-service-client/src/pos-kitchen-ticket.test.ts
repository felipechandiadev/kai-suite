import { describe, expect, it } from "vitest";
import type { PosKitchenTicketPayload } from "./pos-kitchen-ticket";
import {
  POS_KITCHEN_TICKET_FOOTER_NOTE,
  POS_KITCHEN_TICKET_PAYLOAD_VERSION,
} from "./pos-kitchen-ticket";
import { agentPrintTypeMayOpenCashDrawer } from "./cash-drawer-policy";

describe("pos-kitchen-ticket contract", () => {
  it("exports stable version and footer", () => {
    expect(POS_KITCHEN_TICKET_PAYLOAD_VERSION).toBe(1);
    expect(POS_KITCHEN_TICKET_FOOTER_NOTE).toMatch(/comanda/i);
  });

  it("accepts a minimal valid payload shape and never opens cash drawer", () => {
    const payload: PosKitchenTicketPayload = {
      version: POS_KITCHEN_TICKET_PAYLOAD_VERSION,
      company: {
        razonSocial: "Ohlala SpA",
        nombreFantasia: "Ohlala",
        rut: "76.543.211-1",
        businessActivity: null,
        logoBase64: null,
      },
      productionUnitName: "Cocina",
      fireNumber: 12,
      accountLabel: "Mesa 3",
      tableCode: "M3",
      issuedAt: "2026-08-05T12:00:00.000Z",
      lines: [{ name: "Completo", quantity: 2, notes: "sin mayo" }],
      footerNote: POS_KITCHEN_TICKET_FOOTER_NOTE,
    };
    expect(payload.fireNumber).toBe(12);
    expect(agentPrintTypeMayOpenCashDrawer("pos-kitchen-ticket")).toBe(false);
  });
});
