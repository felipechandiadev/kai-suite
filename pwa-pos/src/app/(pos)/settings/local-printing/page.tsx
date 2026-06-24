import { readFileSync } from "node:fs";
import path from "node:path";
import type { KaiScreenAndroidManifest } from "@flowstore/customer-display-client";
import type { KaiPrintersAndroidManifest } from "@flowstore/print-service-client";
import { PosLocalPrintPreferencesForm } from "./PosLocalPrintPreferencesForm";

function readKaiPrintersAndroidManifest(): KaiPrintersAndroidManifest {
  const manifestPath = path.join(
    process.cwd(),
    "public/downloads/kai-printers-android.manifest.json",
  );
  return JSON.parse(readFileSync(manifestPath, "utf8")) as KaiPrintersAndroidManifest;
}

function readKaiScreenAndroidManifest(): KaiScreenAndroidManifest {
  const manifestPath = path.join(
    process.cwd(),
    "public/downloads/kai-screen-android.manifest.json",
  );
  return JSON.parse(readFileSync(manifestPath, "utf8")) as KaiScreenAndroidManifest;
}

export default function PosLocalPrintingPage() {
  const kaiPrintersAndroidManifest = readKaiPrintersAndroidManifest();
  const kaiScreenAndroidManifest = readKaiScreenAndroidManifest();

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-6">
      <h1
        className="text-xl font-semibold tracking-tight"
        style={{ color: "var(--color-foreground)" }}
      >
        Impresión local
      </h1>
      <PosLocalPrintPreferencesForm
        kaiPrintersAndroidManifest={kaiPrintersAndroidManifest}
        kaiScreenAndroidManifest={kaiScreenAndroidManifest}
      />
    </div>
  );
}
