import { BasicPageLayout } from "@/shared/components/layouts/BasicPageLayout";
import { getFiscalSummaryAction } from "@/features/fiscal/actions/fiscal.actions";
import { SiiProductionForm } from "@/features/fiscal/ui/SiiProductionForm";

export const dynamic = "force-dynamic";

export default async function SiiProduccionPage() {
  const res = await getFiscalSummaryAction();
  if (!res.success) {
    return (
      <BasicPageLayout title="Producción SII" subtitle="Activar emisión en ambiente real">
        <p className="text-sm text-destructive">{res.error}</p>
      </BasicPageLayout>
    );
  }

  return (
    <BasicPageLayout
      title="Producción SII"
      subtitle="Habilitar emisión tras certificación (POS sigue en ticket)"
    >
      <SiiProductionForm summary={res.summary} />
    </BasicPageLayout>
  );
}
