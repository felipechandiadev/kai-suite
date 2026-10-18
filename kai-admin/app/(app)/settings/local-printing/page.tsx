import { loadKaiPrintersDownloadOffers } from "@kai/print-service-client";
import { AdminLocalPrintingSettingsForm } from "./AdminLocalPrintingSettingsForm";

export default async function LocalPrintingSettingsPage() {
  const downloadOffers = await loadKaiPrintersDownloadOffers();

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Impresión local</h1>
      <AdminLocalPrintingSettingsForm downloadOffers={downloadOffers} />
    </div>
  );
}
