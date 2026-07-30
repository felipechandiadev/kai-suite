import { describe, expect, it } from "vitest";
import { productSkipsDte } from "./PosNoDteBadge";

describe("PosNoDteBadge helpers", () => {
  it("productSkipsDte solo cuando requiresDte es false explícito", () => {
    expect(productSkipsDte(false)).toBe(true);
    expect(productSkipsDte(true)).toBe(false);
    expect(productSkipsDte(undefined)).toBe(false);
    expect(productSkipsDte(null)).toBe(false);
  });
});
