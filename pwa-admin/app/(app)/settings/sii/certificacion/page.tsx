import { BasicPageLayout } from "@/shared/components/layouts/BasicPageLayout";
import { getFiscalSummaryAction } from "@/features/fiscal/actions/fiscal.actions";
import { SiiCertificationWizard } from "@/features/fiscal/ui/SiiCertificationWizard";

export const dynamic = "force-dynamic";

export default async function SiiCertificacionPage() {
  const res = await getFiscalSummaryAction();
  if (!res.success) {
    return (
      <BasicPageLayout title="Certificación SII" subtitle="Set BE y validación portal">
        <p className="text-sm text-destructive">{res.error}</p>
      </BasicPageLayout>
    );
  }

  return (
    <BasicPageLayout
      title="Certificación SII"
      subtitle="Set de prueba BE, envío boletas, RCO y consulta Track ID"
    >
      <SiiCertificationWizard summary={res.summary} />
    </BasicPageLayout>
  );
}
