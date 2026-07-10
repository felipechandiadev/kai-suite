import { BasicPageLayout } from "@kai/ui";
import { getFiscalSummaryAction } from "@/features/fiscal/actions/fiscal.actions";
import { SiiGeneralView } from "@/features/fiscal/ui/SiiGeneralView";
import { SiiNarrowContent } from "@/features/fiscal/ui/SiiNarrowContent";

export const dynamic = "force-dynamic";

export default async function SiiGeneralPage() {
  const res = await getFiscalSummaryAction();
  if (!res.success) {
    return (
      <SiiNarrowContent>
        <BasicPageLayout title="SII — General" subtitle="Estado de certificación y ambiente">
          <p className="text-sm text-destructive">{res.error}</p>
        </BasicPageLayout>
      </SiiNarrowContent>
    );
  }

  return (
    <SiiNarrowContent>
      <BasicPageLayout
        title="SII — General"
        subtitle="Estado de certificación, ambiente y progreso"
      >
        <SiiGeneralView summary={res.summary} />
      </BasicPageLayout>
    </SiiNarrowContent>
  );
}
