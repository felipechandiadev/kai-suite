import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import type {
  KaiPrintersAndroidManifest,
  KaiPrintersDesktopManifest,
  KaiPrintersDownloadsManifests,
} from "@flowstore/print-service-client";
import {
  KAI_PRINTERS_ANDROID_MANIFEST_DEFAULT,
  KAI_PRINTERS_MACOS_MANIFEST_DEFAULT,
  KAI_PRINTERS_WINDOWS_MANIFEST_DEFAULT,
} from "@flowstore/print-service-client";
import { PosLocalPrintPreferencesForm } from "./PosLocalPrintPreferencesForm";

function readJsonFile<T>(filePath: string, fallback: T): T {
  if (!existsSync(filePath)) return fallback;
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function readKaiPrintersDownloadsManifests(): KaiPrintersDownloadsManifests {
  const dir = path.join(process.cwd(), "public/downloads");
  return {
    android: readJsonFile<KaiPrintersAndroidManifest>(
      path.join(dir, "kai-printers-android.manifest.json"),
      KAI_PRINTERS_ANDROID_MANIFEST_DEFAULT,
    ),
    windows: readJsonFile<KaiPrintersDesktopManifest>(
      path.join(dir, "kai-printers-windows.manifest.json"),
      KAI_PRINTERS_WINDOWS_MANIFEST_DEFAULT,
    ),
    macos: readJsonFile<KaiPrintersDesktopManifest>(
      path.join(dir, "kai-printers-macos.manifest.json"),
      KAI_PRINTERS_MACOS_MANIFEST_DEFAULT,
    ),
  };
}

export default function PosLocalPrintingPage() {
  const initialManifests = readKaiPrintersDownloadsManifests();

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-6">
      <h1
        className="text-xl font-semibold tracking-tight"
        style={{ color: "var(--color-foreground)" }}
      >
        Impresión local
      </h1>
      <PosLocalPrintPreferencesForm initialManifests={initialManifests} />
    </div>
  );
}
