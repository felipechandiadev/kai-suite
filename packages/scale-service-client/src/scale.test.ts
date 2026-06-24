import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { parseScaleFrame, normalizeWeightToGrams, buildScaleReading } from "./parse";
import {
  SCALE_STORAGE_KEY,
  readScaleConfigFromStorage,
  writeScaleConfigToStorage,
} from "./storage";

describe("parseScaleFrame", () => {
  it("parses standard gram frame", () => {
    expect(parseScaleFrame("+000125.00 g")).toEqual({ value: 125, unit: "g" });
  });

  it("parses frame with CRLF", () => {
    expect(parseScaleFrame("+000125.00 g\r\n")).toEqual({ value: 125, unit: "g" });
  });

  it("returns null value for empty frame", () => {
    expect(parseScaleFrame("")).toEqual({ value: null, unit: null });
  });

  it("parses negative values", () => {
    expect(parseScaleFrame("-000012.50 g")).toEqual({ value: -12.5, unit: "g" });
  });
});

describe("normalizeWeightToGrams", () => {
  it("keeps grams as-is", () => {
    expect(normalizeWeightToGrams(5.2, "g")).toBe(5.2);
  });

  it("converts ounces", () => {
    expect(normalizeWeightToGrams(1, "oz")).toBeCloseTo(28.35, 1);
  });

  it("converts carats", () => {
    expect(normalizeWeightToGrams(10, "ct")).toBe(2);
  });

  it("uses fallback unit when unit is null", () => {
    expect(normalizeWeightToGrams(3, null, "g")).toBe(3);
  });
});

describe("buildScaleReading", () => {
  it("builds full reading with grams", () => {
    const reading = buildScaleReading("+000125.00 g");
    expect(reading).toEqual({
      rawFrame: "+000125.00 g",
      value: 125,
      unit: "g",
      weightGrams: 125,
    });
  });
});

describe("storage", () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    (globalThis as { window?: Window }).window = {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          storage.set(key, value);
        },
        removeItem: (key: string) => {
          storage.delete(key);
        },
        clear: () => storage.clear(),
        key: () => null,
        length: 0,
      },
    } as unknown as Window;
  });

  afterEach(() => {
    delete (globalThis as { window?: Window }).window;
  });

  it("returns defaults when empty", () => {
    const cfg = readScaleConfigFromStorage();
    expect(cfg.enabled).toBe(false);
    expect(cfg.baudRate).toBe(9600);
  });

  it("round-trips partial patch", () => {
    writeScaleConfigToStorage({ enabled: true, baudRate: 19200 });
    const cfg = readScaleConfigFromStorage();
    expect(cfg.enabled).toBe(true);
    expect(cfg.baudRate).toBe(19200);
    expect(storage.get(SCALE_STORAGE_KEY)).toContain('"baudRate":19200');
  });
});
