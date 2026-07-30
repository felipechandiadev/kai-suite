import { describe, expect, it } from "vitest";
import { resolveHeroAutoplayMs } from "./eshop-hero-autoplay";

describe("resolveHeroAutoplayMs", () => {
  it("converts seconds to ms with minimum clamp", () => {
    expect(resolveHeroAutoplayMs(6)).toBe(6000);
    expect(resolveHeroAutoplayMs(2)).toBe(3000);
    expect(resolveHeroAutoplayMs(0)).toBe(6000);
  });
});
