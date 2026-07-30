import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import type { KaiPrintersDownloadsManifests } from "@kai/print-service-client";
import {
  KAI_PRINTERS_ANDROID_MANIFEST_DEFAULT,
  KAI_PRINTERS_MACOS_MANIFEST_DEFAULT,
  KAI_PRINTERS_WINDOWS_MANIFEST_DEFAULT,
} from "@kai/print-service-client";
import { AdminLocalPrintingSettingsForm } from "./AdminLocalPrintingSettingsForm";

function readJsonFile<T>(filePath: string, fallback: T): T {
  if (!existsSync(filePath)) return fallback;
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function readKaiPrintersDownloadsManifests(): KaiPrintersDownloadsManifests {
  const posPublic = path.join(process.cwd(), "..", "kai-pos", "public", "downloads");
  const localPublic = path.join(process.cwd(), "public", "downloads");
  const dir = existsSync(posPublic) ? posPublic : localPublic;

  return {
    android: readJsonFile(
      path.join(dir, "kai-printers-android.manifest.json"),
      KAI_PRINTERS_ANDROID_MANIFEST_DEFAULT,
    ),
    windows: readJsonFile(
      path.join(dir, "kai-printers-windows.manifest.json"),
      KAI_PRINTERS_WINDOWS_MANIFEST_DEFAULT,
    ),
    macos: readJsonFile(
      path.join(dir, "kai-printers-macos.manifest.json"),
      KAI_PRINTERS_MACOS_MANIFEST_DEFAULT,
    ),
  };
}

export default function LocalPrintingSettingsPage() {
  const initialManifests = readKaiPrintersDownloadsManifests();

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Impresión local</h1>
      <AdminLocalPrintingSettingsForm initialManifests={initialManifests} />
    </div>
  );
}
