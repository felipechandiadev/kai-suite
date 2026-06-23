import { afterEach, describe, expect, it } from "vitest";
import {
  listKaiPrintersDownloadOffers,
  resolveKaiPrintersDownloadUrl,
} from "./kai-printers-downloads";

describe("resolveKaiPrintersDownloadUrl", () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_KAI_PRINTERS_ANDROID_URL;
    delete process.env.NEXT_PUBLIC_KAI_PRINTERS_WINDOWS_URL;
    delete process.env.NEXT_PUBLIC_KAI_PRINTERS_MACOS_URL;
  });

  it("defaults Android to /downloads/kai-printers-android.apk", () => {
    expect(resolveKaiPrintersDownloadUrl("android")).toBe("/downloads/kai-printers-android.apk");
  });

  it("uses env override when set", () => {
    process.env.NEXT_PUBLIC_KAI_PRINTERS_ANDROID_URL =
      "https://pos.example.cl/downloads/kai-printers-android.apk";
    expect(resolveKaiPrintersDownloadUrl("android")).toBe(
      "https://pos.example.cl/downloads/kai-printers-android.apk",
    );
  });

  it("returns null for desktop without env", () => {
    expect(resolveKaiPrintersDownloadUrl("windows")).toBeNull();
    expect(resolveKaiPrintersDownloadUrl("macos")).toBeNull();
  });

  it("listKaiPrintersDownloadOffers includes href per platform", () => {
    const offers = listKaiPrintersDownloadOffers();
    expect(offers.find((o) => o.platform === "android")?.href).toBe(
      "/downloads/kai-printers-android.apk",
    );
    expect(offers.find((o) => o.platform === "windows")?.href).toBeNull();
  });
});
