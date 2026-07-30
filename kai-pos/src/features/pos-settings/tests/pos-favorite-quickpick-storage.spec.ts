import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_POS_FAVORITE_BUTTON_SIZE,
  normalizePosFavoriteButtonSize,
  POS_FAVORITE_BUTTON_SIZE_LS_KEY,
  readPosFavoriteButtonSize,
  writePosFavoriteButtonSize,
} from "../lib/pos-favorite-quickpick-storage";

vi.mock("@kai-shared/storage-key-migrate", () => ({
  getMigratedLocalStorageItem: vi.fn(),
  setMigratedLocalStorageItem: vi.fn(),
}));

import {
  getMigratedLocalStorageItem,
  setMigratedLocalStorageItem,
} from "@kai-shared/storage-key-migrate";

describe("pos-favorite-quickpick-storage", () => {
  beforeEach(() => {
    vi.mocked(getMigratedLocalStorageItem).mockReset();
    vi.mocked(setMigratedLocalStorageItem).mockReset();
  });

  it("defaults to xs when storage is empty", () => {
    vi.mocked(getMigratedLocalStorageItem).mockReturnValue(null);
    expect(readPosFavoriteButtonSize()).toBe("xs");
  });

  it("normalizes invalid values to default", () => {
    expect(normalizePosFavoriteButtonSize("xxl")).toBe(DEFAULT_POS_FAVORITE_BUTTON_SIZE);
    expect(normalizePosFavoriteButtonSize("")).toBe(DEFAULT_POS_FAVORITE_BUTTON_SIZE);
    expect(normalizePosFavoriteButtonSize("MD")).toBe("md");
  });

  it("round-trips write and read", () => {
    vi.stubGlobal("window", {
      dispatchEvent: vi.fn(),
    });
    vi.mocked(setMigratedLocalStorageItem).mockImplementation((_key, _legacy, value) => {
      vi.mocked(getMigratedLocalStorageItem).mockReturnValue(String(value));
    });

    writePosFavoriteButtonSize("lg");
    expect(setMigratedLocalStorageItem).toHaveBeenCalledWith(
      POS_FAVORITE_BUTTON_SIZE_LS_KEY,
      expect.any(String),
      "lg",
    );
    expect(readPosFavoriteButtonSize()).toBe("lg");
    vi.unstubAllGlobals();
  });
});
