import { describe, expect, it } from "vitest";
import { formatPrepDuration } from "./format-prep-duration";

describe("formatPrepDuration", () => {
  it("formats minutes and seconds", () => {
    expect(formatPrepDuration(0)).toBe("0:00");
    expect(formatPrepDuration(4_000)).toBe("0:04");
    expect(formatPrepDuration(272_000)).toBe("4:32");
  });

  it("returns dash for missing", () => {
    expect(formatPrepDuration(null)).toBe("—");
    expect(formatPrepDuration(undefined)).toBe("—");
  });
});
