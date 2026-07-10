import { describe, expect, it } from "vitest";
import { evaluatePosEntry } from "../domain/evaluate-pos-entry";

const openSession = {
  id: "session-1",
  status: "OPEN",
  openedById: "user-a",
  pointOfSaleId: "pos-1",
};

describe("evaluatePosEntry", () => {
  it("rechaza usuario no autenticado", () => {
    expect(
      evaluatePosEntry({
        userId: null,
        pointOfSaleId: "pos-1",
        cashSessionId: "session-1",
        posKind: "SALE",
        assignedPointOfSaleIds: ["pos-1"],
        openSessionForPos: openSession,
      }).valid,
    ).toBe(false);
  });

  it("permite preventa sin sesión de caja", () => {
    expect(
      evaluatePosEntry({
        userId: "user-a",
        pointOfSaleId: "pos-1",
        cashSessionId: null,
        posKind: "PRESALE",
        assignedPointOfSaleIds: ["pos-1"],
        openSessionForPos: null,
      }),
    ).toEqual({ valid: true });
  });

  it("rechaza preventa con cashSessionId", () => {
    expect(
      evaluatePosEntry({
        userId: "user-a",
        pointOfSaleId: "pos-1",
        cashSessionId: "session-1",
        posKind: "PRESALE",
        assignedPointOfSaleIds: ["pos-1"],
        openSessionForPos: null,
      }).valid,
    ).toBe(false);
  });

  it("rechaza venta sin sesión de caja", () => {
    expect(
      evaluatePosEntry({
        userId: "user-a",
        pointOfSaleId: "pos-1",
        cashSessionId: null,
        posKind: "SALE",
        assignedPointOfSaleIds: ["pos-1"],
        openSessionForPos: null,
      }).valid,
    ).toBe(false);
  });

  it("permite venta con sesión propia abierta", () => {
    expect(
      evaluatePosEntry({
        userId: "user-a",
        pointOfSaleId: "pos-1",
        cashSessionId: "session-1",
        posKind: "SALE",
        assignedPointOfSaleIds: ["pos-1"],
        openSessionForPos: openSession,
      }),
    ).toEqual({ valid: true });
  });

  it("rechaza venta con sesión de otro usuario", () => {
    const result = evaluatePosEntry({
      userId: "user-b",
      pointOfSaleId: "pos-1",
      cashSessionId: "session-1",
      posKind: "SALE",
      assignedPointOfSaleIds: ["pos-1"],
      openSessionForPos: openSession,
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain("otro usuario");
    }
  });

  it("rechaza POS no asignado", () => {
    expect(
      evaluatePosEntry({
        userId: "user-a",
        pointOfSaleId: "pos-9",
        cashSessionId: "session-1",
        posKind: "SALE",
        assignedPointOfSaleIds: ["pos-1"],
        openSessionForPos: null,
      }).valid,
    ).toBe(false);
  });
});
