import { describe, expect, it } from "vitest";
import { isPosTabletDensity } from "./pos-tablet-density";

describe("isPosTabletDensity", () => {
  it("iMin landscape coarse uses tablet density", () => {
    expect(isPosTabletDensity(960, 540, true)).toBe(true);
  });

  it("iMin portrait coarse uses tablet density", () => {
    expect(isPosTabletDensity(800, 1280, true)).toBe(true);
  });

  it("phone portrait stays compact not tablet density", () => {
    expect(isPosTabletDensity(390, 844, true)).toBe(false);
  });

  it("desktop with mouse is not tablet density", () => {
    expect(isPosTabletDensity(1920, 1080, false)).toBe(false);
  });
});
