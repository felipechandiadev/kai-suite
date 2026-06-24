import { afterEach, describe, expect, it } from "vitest";
import {
  KAI_SCREEN_ANDROID_MANIFEST_DEFAULT,
  androidManifestFilename,
  listKaiScreenDownloadOffers,
  resolveKaiScreenDownloadUrl,
} from "./kai-screen-downloads";

describe("resolveKaiScreenDownloadUrl", () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_KAI_SCREEN_ANDROID_URL;
  });

  it("defaults to versioned APK from manifest", () => {
    expect(resolveKaiScreenDownloadUrl()).toBe("/downloads/kai-screen-android-1.0.1.apk");
  });

  it("uses env override when set", () => {
    process.env.NEXT_PUBLIC_KAI_SCREEN_ANDROID_URL =
      "https://pos.example.cl/downloads/kai-screen-android-1.0.0.apk";
    expect(resolveKaiScreenDownloadUrl()).toBe(
      "https://pos.example.cl/downloads/kai-screen-android-1.0.0.apk",
    );
  });

  it("listKaiScreenDownloadOffers includes href and version", () => {
    const offers = listKaiScreenDownloadOffers();
    expect(offers).toHaveLength(1);
    expect(offers[0]?.href).toBe("/downloads/kai-screen-android-1.0.1.apk");
    expect(offers[0]?.version).toBe("1.0.1");
  });

  it("androidManifestFilename returns manifest filename", () => {
    expect(androidManifestFilename()).toBe(KAI_SCREEN_ANDROID_MANIFEST_DEFAULT.filename);
  });
});
