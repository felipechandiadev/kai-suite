import { afterEach, describe, expect, it } from "vitest";
import {
  KAI_PRINTERS_ANDROID_MANIFEST_DEFAULT,
  KAI_PRINTERS_MACOS_MANIFEST_DEFAULT,
  KAI_PRINTERS_WINDOWS_MANIFEST_DEFAULT,
  androidManifestFilename,
  listKaiPrintersDownloadOffers,
  resolveKaiPrintersDownloadUrl,
} from "./kai-printers-downloads";

const SAMPLE_MANIFESTS = {
  android: KAI_PRINTERS_ANDROID_MANIFEST_DEFAULT,
  windows: KAI_PRINTERS_WINDOWS_MANIFEST_DEFAULT,
  macos: KAI_PRINTERS_MACOS_MANIFEST_DEFAULT,
};

describe("resolveKaiPrintersDownloadUrl", () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_KAI_PRINTERS_ANDROID_URL;
    delete process.env.NEXT_PUBLIC_KAI_PRINTERS_WINDOWS_URL;
    delete process.env.NEXT_PUBLIC_KAI_PRINTERS_MACOS_URL;
  });

  it("defaults Android to versioned APK from manifest", () => {
    expect(resolveKaiPrintersDownloadUrl("android", SAMPLE_MANIFESTS)).toBe(
      "/downloads/kai-printers-android-1.1.8.apk",
    );
  });

  it("defaults Windows and macOS from manifests", () => {
    expect(resolveKaiPrintersDownloadUrl("windows", SAMPLE_MANIFESTS)).toBe(
      "/downloads/kai-printers-windows-1.0.5-x64-portable.zip",
    );
    expect(resolveKaiPrintersDownloadUrl("macos", SAMPLE_MANIFESTS)).toBe(
      "/downloads/kai-printers-macos-1.0.5-aarch64.dmg",
    );
  });

  it("uses env override when set", () => {
    process.env.NEXT_PUBLIC_KAI_PRINTERS_ANDROID_URL =
      "https://pos.example.cl/downloads/kai-printers-android-1.1.8.apk";
    expect(resolveKaiPrintersDownloadUrl("android", SAMPLE_MANIFESTS)).toBe(
      "https://pos.example.cl/downloads/kai-printers-android-1.1.8.apk",
    );
  });

  it("listKaiPrintersDownloadOffers includes href and version per platform", () => {
    const offers = listKaiPrintersDownloadOffers(SAMPLE_MANIFESTS);
    expect(offers.find((o) => o.platform === "android")?.href).toBe(
      "/downloads/kai-printers-android-1.1.8.apk",
    );
    expect(offers.find((o) => o.platform === "windows")?.href).toBe(
      "/downloads/kai-printers-windows-1.0.5-x64-portable.zip",
    );
    expect(offers.find((o) => o.platform === "macos")?.href).toBe(
      "/downloads/kai-printers-macos-1.0.5-aarch64.dmg",
    );
  });

  it("androidManifestFilename reads from manifest", () => {
    expect(androidManifestFilename()).toBe(KAI_PRINTERS_ANDROID_MANIFEST_DEFAULT.filename);
  });
});
