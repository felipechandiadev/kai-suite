import { afterEach, describe, expect, it, vi } from "vitest";
import {
  listKaiPrintersDownloadOffers,
  loadKaiPrintersDownloadOffers,
  loadKaiPrintersDownloadsManifests,
  resolveKaiDownloadsBaseUrl,
  resolveKaiPrintersDownloadUrl,
  type KaiPrintersDownloadsManifests,
} from "./kai-printers-downloads";

const BASE = "https://cdn.example.cl/kai-downloads";

const MANIFESTS: KaiPrintersDownloadsManifests = {
  android: {
    version: "1.2.0",
    versionCode: 30,
    filename: "kai-printers-android-1.2.0.apk",
    builtAt: "2026-10-01T00:00:00Z",
  },
  windows: {
    version: "1.7.0",
    filename: "kai-printers-windows-1.7.0-x64-portable.zip",
    builtAt: "2026-10-18T05:14:41.983Z",
    note: "ZIP portable.",
  },
};

function mockFetch(byUrl: Record<string, unknown>) {
  return vi.fn(async (url: string) => {
    const body = byUrl[url];
    return {
      ok: body !== undefined,
      json: async () => body,
    } as Response;
  });
}

afterEach(() => {
  delete process.env.KAI_DOWNLOADS_URL;
  delete process.env.NEXT_PUBLIC_KAI_PRINTERS_DOWNLOADS_BASE;
  delete process.env.NEXT_PUBLIC_KAI_PRINTERS_ANDROID_URL;
  vi.unstubAllGlobals();
});

describe("resolveKaiDownloadsBaseUrl", () => {
  it("returns null without env", () => {
    expect(resolveKaiDownloadsBaseUrl()).toBeNull();
  });

  it("prefers KAI_DOWNLOADS_URL over legacy key and trims trailing slash", () => {
    process.env.NEXT_PUBLIC_KAI_PRINTERS_DOWNLOADS_BASE = "https://legacy.example.cl";
    process.env.KAI_DOWNLOADS_URL = `${BASE}/`;
    expect(resolveKaiDownloadsBaseUrl()).toBe(BASE);
  });

  it("falls back to legacy NEXT_PUBLIC_KAI_PRINTERS_DOWNLOADS_BASE", () => {
    process.env.NEXT_PUBLIC_KAI_PRINTERS_DOWNLOADS_BASE = BASE;
    expect(resolveKaiDownloadsBaseUrl()).toBe(BASE);
  });
});

describe("resolveKaiPrintersDownloadUrl", () => {
  it("builds absolute URL from base + manifest filename", () => {
    expect(resolveKaiPrintersDownloadUrl("windows", MANIFESTS, BASE)).toBe(
      `${BASE}/kai-printers-windows-1.7.0-x64-portable.zip`,
    );
  });

  it("returns null without base or manifest", () => {
    expect(resolveKaiPrintersDownloadUrl("windows", MANIFESTS, null)).toBeNull();
    expect(resolveKaiPrintersDownloadUrl("macos", MANIFESTS, BASE)).toBeNull();
  });

  it("per-platform env override wins", () => {
    process.env.NEXT_PUBLIC_KAI_PRINTERS_ANDROID_URL = "https://other.example.cl/app.apk";
    expect(resolveKaiPrintersDownloadUrl("android", {}, null)).toBe(
      "https://other.example.cl/app.apk",
    );
  });
});

describe("listKaiPrintersDownloadOffers", () => {
  it("only lists platforms with a resolvable URL", () => {
    const offers = listKaiPrintersDownloadOffers(MANIFESTS, BASE);
    expect(offers.map((o) => o.platform)).toEqual(["android", "windows"]);
    expect(offers[1]).toMatchObject({
      version: "1.7.0",
      installHint: "ZIP portable.",
      href: `${BASE}/kai-printers-windows-1.7.0-x64-portable.zip`,
    });
  });

  it("is empty without base URL", () => {
    expect(listKaiPrintersDownloadOffers(MANIFESTS, null)).toEqual([]);
  });
});

describe("loadKaiPrintersDownloadsManifests", () => {
  it("returns {} and does not fetch without base URL", async () => {
    const fetchMock = mockFetch({});
    vi.stubGlobal("fetch", fetchMock);
    expect(await loadKaiPrintersDownloadsManifests(null)).toEqual({});
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reads manifests from the base URL and skips missing/invalid ones", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch({
        [`${BASE}/kai-printers-android.manifest.json`]: MANIFESTS.android,
        [`${BASE}/kai-printers-windows.manifest.json`]: MANIFESTS.windows,
        [`${BASE}/kai-printers-macos.manifest.json`]: { version: "1.0.0" },
      }),
    );
    const manifests = await loadKaiPrintersDownloadsManifests(BASE);
    expect(manifests.android?.version).toBe("1.2.0");
    expect(manifests.windows?.version).toBe("1.7.0");
    expect(manifests.macos).toBeUndefined();
  });
});

describe("loadKaiPrintersDownloadOffers", () => {
  it("resolves offers end-to-end from KAI_DOWNLOADS_URL", async () => {
    process.env.KAI_DOWNLOADS_URL = BASE;
    vi.stubGlobal(
      "fetch",
      mockFetch({ [`${BASE}/kai-printers-windows.manifest.json`]: MANIFESTS.windows }),
    );
    const offers = await loadKaiPrintersDownloadOffers();
    expect(offers).toHaveLength(1);
    expect(offers[0]?.href).toBe(`${BASE}/kai-printers-windows-1.7.0-x64-portable.zip`);
  });
});
