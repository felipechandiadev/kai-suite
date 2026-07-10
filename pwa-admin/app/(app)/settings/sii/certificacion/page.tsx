import { BasicPageLayout } from "@kai/ui";
import { getFiscalSummaryAction } from "@/features/fiscal/actions/fiscal.actions";
import { SiiCertificationWizard } from "@/features/fiscal/ui/SiiCertificationWizard";
import { SiiNarrowContent } from "@/features/fiscal/ui/SiiNarrowContent";

export const dynamic = "force-dynamic";

export default async function SiiCertificacionPage() {
  const res = await getFiscalSummaryAction();
  if (!res.success) {
    return (
      <SiiNarrowContent>
        <BasicPageLayout title="Certificación SII" subtitle="Set BE y validación portal">
          <p className="text-sm text-destructive">{res.error}</p>
        </BasicPageLayout>
      </SiiNarrowContent>
    );
  }

  return (
    <SiiNarrowContent>
      <BasicPageLayout
        title="Certificación SII"
        subtitle="Set de prueba BE, envío boletas, RCO y consulta Track ID"
      >
        <SiiCertificationWizard summary={res.summary} />
      </BasicPageLayout>
    </SiiNarrowContent>
  );
}
