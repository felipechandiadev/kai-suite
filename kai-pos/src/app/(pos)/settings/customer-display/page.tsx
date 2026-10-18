import { loadKaiScreenDownloadOffer } from "@kai/customer-display-client";
import { PosCustomerDisplaySettingsSection } from "@/features/customer-display/ui/PosCustomerDisplaySettingsSection";

export default async function PosCustomerDisplayPage() {
  const kaiScreenDownloadOffer = await loadKaiScreenDownloadOffer();

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
      <PosCustomerDisplaySettingsSection kaiScreenDownloadOffer={kaiScreenDownloadOffer} />
    </div>
  );
}
