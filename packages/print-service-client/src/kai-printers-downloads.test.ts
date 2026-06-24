import { afterEach, describe, expect, it } from "vitest";
import {
  KAI_PRINTERS_ANDROID_MANIFEST_DEFAULT,
  androidManifestFilename,
  listKaiPrintersDownloadOffers,
  resolveKaiPrintersDownloadUrl,
} from "./kai-printers-downloads";

describe("resolveKaiPrintersDownloadUrl", () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_KAI_PRINTERS_ANDROID_URL;
    delete process.env.NEXT_PUBLIC_KAI_PRINTERS_WINDOWS_URL;
    delete process.env.NEXT_PUBLIC_KAI_PRINTERS_MACOS_URL;
  });

  it("defaults Android to versioned APK from manifest", () => {
    expect(resolveKaiPrintersDownloadUrl("android")).toBe(
      "/downloads/kai-printers-android-1.1.4.apk",
    );
  });

  it("uses env override when set", () => {
    process.env.NEXT_PUBLIC_KAI_PRINTERS_ANDROID_URL =
      "https://pos.example.cl/downloads/kai-printers-android-1.1.4.apk";
    expect(resolveKaiPrintersDownloadUrl("android")).toBe(
      "https://pos.example.cl/downloads/kai-printers-android-1.1.4.apk",
    );
  });

  it("returns null for desktop without env", () => {
    expect(resolveKaiPrintersDownloadUrl("windows")).toBeNull();
    expect(resolveKaiPrintersDownloadUrl("macos")).toBeNull();
  });

  it("listKaiPrintersDownloadOffers includes href and version per platform", () => {
    const offers = listKaiPrintersDownloadOffers();
    const android = offers.find((o) => o.platform === "android");
    expect(android?.href).toBe("/downloads/kai-printers-android-1.1.4.apk");
    expect(android?.version).toBe("1.1.4");
    expect(offers.find((o) => o.platform === "windows")?.href).toBeNull();
  });

  it("androidManifestFilename reads from manifest", () => {
    expect(androidManifestFilename()).toBe(KAI_PRINTERS_ANDROID_MANIFEST_DEFAULT.filename);
  });
});
