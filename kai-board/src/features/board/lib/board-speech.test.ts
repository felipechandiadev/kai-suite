import { describe, expect, it } from "vitest";
import {
  buildReadyAnnouncement,
  boardReadySpeechKey,
} from "./board-speech";
import type { BoardTicket } from "./board.types";

describe("board-speech", () => {
  const ticket: BoardTicket = {
    fireId: "f1",
    orderId: "o1",
    kitchenFireNumber: 56,
    customerName: "Juan",
    column: "READY",
    readyAt: null,
    updatedAt: new Date().toISOString(),
  };

  it("builds Catalina-ready announcement", () => {
    expect(buildReadyAnnouncement(ticket)).toBe(
      "El pedido número 56 de Juan está listo para retirar",
    );
  });

  it("dedupe key uses fireId", () => {
    expect(boardReadySpeechKey(ticket)).toBe("f1:READY");
  });
});
