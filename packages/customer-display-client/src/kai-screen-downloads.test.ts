import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildKaiScreenDownloadOffer,
  loadKaiScreenDownloadOffer,
  resolveKaiScreenDownloadUrl,
  resolveKaiScreenDownloadsBaseUrl,
  type KaiScreenAndroidManifest,
} from "./kai-screen-downloads";

const BASE = "https://cdn.example.cl/kai-downloads";

const MANIFEST: KaiScreenAndroidManifest = {
  version: "1.2.0",
  versionCode: 5,
  filename: "kai-screen-android-1.2.0.apk",
  builtAt: "2026-08-04T00:00:00Z",
};

afterEach(() => {
  delete process.env.KAI_DOWNLOADS_URL;
  delete process.env.NEXT_PUBLIC_KAI_PRINTERS_DOWNLOADS_BASE;
  delete process.env.NEXT_PUBLIC_KAI_SCREEN_ANDROID_URL;
  vi.unstubAllGlobals();
});

describe("Kai Screen downloads", () => {
  it("base URL comes from KAI_DOWNLOADS_URL without trailing slash", () => {
    expect(resolveKaiScreenDownloadsBaseUrl()).toBeNull();
    process.env.KAI_DOWNLOADS_URL = `${BASE}/`;
    expect(resolveKaiScreenDownloadsBaseUrl()).toBe(BASE);
  });

  it("builds absolute APK URL from base + manifest", () => {
    expect(resolveKaiScreenDownloadUrl(MANIFEST, BASE)).toBe(
      `${BASE}/kai-screen-android-1.2.0.apk`,
    );
    expect(resolveKaiScreenDownloadUrl(MANIFEST, null)).toBeNull();
    expect(resolveKaiScreenDownloadUrl(undefined, BASE)).toBeNull();
  });

  it("env override wins", () => {
    process.env.NEXT_PUBLIC_KAI_SCREEN_ANDROID_URL = "https://other.example.cl/screen.apk";
    expect(resolveKaiScreenDownloadUrl(undefined, null)).toBe(
      "https://other.example.cl/screen.apk",
    );
  });

  it("offer is null when no URL resolves", () => {
    expect(buildKaiScreenDownloadOffer(MANIFEST, null)).toBeNull();
    expect(buildKaiScreenDownloadOffer(MANIFEST, BASE)?.version).toBe("1.2.0");
  });

  it("loads the manifest from KAI_DOWNLOADS_URL", async () => {
    process.env.KAI_DOWNLOADS_URL = BASE;
    const fetchMock = vi.fn(async (url: string) => ({
      ok: url === `${BASE}/kai-screen-android.manifest.json`,
      json: async () => MANIFEST,
    }));
    vi.stubGlobal("fetch", fetchMock);
    const offer = await loadKaiScreenDownloadOffer();
    expect(offer?.href).toBe(`${BASE}/kai-screen-android-1.2.0.apk`);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
