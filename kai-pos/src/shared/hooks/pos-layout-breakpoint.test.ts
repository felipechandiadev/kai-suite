import { describe, expect, it } from "vitest";
import { isPosCompactLayout } from "./pos-layout-breakpoint";

describe("isPosCompactLayout", () => {
  it("phone portrait stays compact", () => {
    expect(isPosCompactLayout(390, 844, true)).toBe(true);
  });

  it("iMin landscape 960x540 uses desktop layout", () => {
    expect(isPosCompactLayout(960, 540, true)).toBe(false);
  });

  it("iMin landscape 1024x768 uses desktop layout", () => {
    expect(isPosCompactLayout(1024, 768, true)).toBe(false);
  });

  it("iMin portrait 800x1280 uses desktop layout", () => {
    expect(isPosCompactLayout(800, 1280, true)).toBe(false);
  });

  it("narrow desktop browser stays desktop", () => {
    expect(isPosCompactLayout(1200, 800, false)).toBe(false);
  });

  it("small tablet without coarse pointer stays compact at 800px width", () => {
    expect(isPosCompactLayout(800, 600, false)).toBe(true);
  });
});
