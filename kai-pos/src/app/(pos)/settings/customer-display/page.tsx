import { readFileSync } from "node:fs";
import path from "node:path";
import type { KaiScreenAndroidManifest } from "@kai/customer-display-client";
import { PosCustomerDisplaySettingsSection } from "@/features/customer-display/ui/PosCustomerDisplaySettingsSection";

function readKaiScreenAndroidManifest(): KaiScreenAndroidManifest {
  const manifestPath = path.join(
    process.cwd(),
    "public/downloads/kai-screen-android.manifest.json",
  );
  return JSON.parse(readFileSync(manifestPath, "utf8")) as KaiScreenAndroidManifest;
}

export default function PosCustomerDisplayPage() {
  const kaiScreenAndroidManifest = readKaiScreenAndroidManifest();

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-6">
      <h1
        className="text-xl font-semibold tracking-tight"
        style={{ color: "var(--color-foreground)" }}
      >
        Pantalla cliente
      </h1>
      <p className="text-sm text-muted-foreground">
        Configura el visor de cliente (Kai CFD) para mostrar el carrito al cliente en la segunda pantalla de la tablet.
      </p>
      <PosCustomerDisplaySettingsSection kaiScreenAndroidManifest={kaiScreenAndroidManifest} />
    </div>
  );
}
