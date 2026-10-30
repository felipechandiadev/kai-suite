import { beforeEach, describe, expect, it } from "vitest";
import { getPosOfflineDb, resetPosOfflineDbForTests } from "../infrastructure/pos-offline-db";
import { nextLocalDocumentNumber } from "../application/device-id";

describe("nextLocalDocumentNumber", () => {
  beforeEach(async () => {
    resetPosOfflineDbForTests();
    const db = getPosOfflineDb();
    await db.delete();
    await db.open();
  });

  it("genera correlativos únicos aunque se pidan en paralelo", async () => {
    const numbers = await Promise.all(Array.from({ length: 20 }, () => nextLocalDocumentNumber()));
    expect(new Set(numbers).size).toBe(20);
    const seqs = numbers.map((n) => Number(n.slice(-5))).sort((a, b) => a - b);
    expect(seqs[0]).toBe(1);
    expect(seqs[19]).toBe(20);
  });
});
