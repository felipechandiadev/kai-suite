import { BasicPageLayout } from "@/shared/components/layouts/BasicPageLayout";
import { getFiscalProfileAction } from "@/features/fiscal/actions/fiscal.actions";
import { profileToEmisorForm } from "@/features/fiscal/types/fiscal.types";
import { SiiEmisorForm } from "@/features/fiscal/ui/SiiEmisorForm";

export const dynamic = "force-dynamic";

export default async function SiiEmisorPage() {
  const res = await getFiscalProfileAction();
  if (!res.success) {
    return (
      <BasicPageLayout title="Emisor SII" subtitle="Datos del contribuyente y resolución">
        <p className="text-sm text-destructive">{res.error}</p>
      </BasicPageLayout>
    );
  }

  return (
    <BasicPageLayout
      title="Emisor SII"
      subtitle="Razón social, giro, dirección y resolución de boletas"
    >
      <SiiEmisorForm initial={profileToEmisorForm(res.fiscalProfile)} />
    </BasicPageLayout>
  );
}
