import { describe, expect, it } from "vitest";
import type { PosDiningAccountTicketPayload } from "./pos-dining-account-ticket";
import {
  POS_DINING_ACCOUNT_TICKET_FOOTER_NOTE,
  POS_DINING_ACCOUNT_TICKET_PAYLOAD_VERSION,
} from "./pos-dining-account-ticket";
import { agentPrintTypeMayOpenCashDrawer } from "./cash-drawer-policy";

describe("pos-dining-account-ticket contract", () => {
  it("exports stable version and footer disclaimer", () => {
    expect(POS_DINING_ACCOUNT_TICKET_PAYLOAD_VERSION).toBe(1);
    expect(POS_DINING_ACCOUNT_TICKET_FOOTER_NOTE).toMatch(/no válido como boleta/i);
  });

  it("accepts a minimal valid payload shape", () => {
    const payload: PosDiningAccountTicketPayload = {
      version: POS_DINING_ACCOUNT_TICKET_PAYLOAD_VERSION,
      company: {
        razonSocial: "Demo SpA",
        nombreFantasia: "Demo Café",
        rut: "76.123.456-7",
        businessActivity: null,
        logoBase64: null,
      },
      account: {
        displayLabel: "Mesa 12",
        tableCode: "12",
        kind: "TABLE",
        status: "BILLING",
      },
      issuedAt: "2026-07-22T12:00:00.000Z",
      lines: [
        {
          name: "Café",
          quantity: 2,
          unitPrice: 1500,
          lineTotal: 3000,
          notes: "sin azúcar",
        },
      ],
      totals: { total: 3000 },
      footerNote: POS_DINING_ACCOUNT_TICKET_FOOTER_NOTE,
    };
    expect(payload.totals.total).toBe(3000);
    expect(agentPrintTypeMayOpenCashDrawer("pos-dining-account-ticket")).toBe(false);
  });
});
