import Link from "next/link";
import { BasicPageLayout } from "@kai/ui";
import { getFiscalSummaryAction } from "@/features/fiscal/actions/fiscal.actions";
import { SiiGeneralView } from "@/features/fiscal/ui/SiiGeneralView";
import { SiiNarrowContent } from "@/features/fiscal/ui/SiiNarrowContent";
import { SII_IMPRESION_PRUEBA } from "@/navigation/sii-routes";

export const dynamic = "force-dynamic";

export default async function SiiGeneralPage() {
  const res = await getFiscalSummaryAction();
  if (!res.success) {
    return (
      <SiiNarrowContent>
        <BasicPageLayout title="SII — Resumen" subtitle="Estado de certificación y ambiente">
          <p className="text-sm text-destructive">{res.error}</p>
        </BasicPageLayout>
      </SiiNarrowContent>
    );
  }

  return (
    <SiiNarrowContent>
      <BasicPageLayout
        title="SII — Resumen"
        subtitle="Estado de certificación, ambiente y progreso"
      >
        <p className="mb-4 text-sm">
          <Link
            href={SII_IMPRESION_PRUEBA}
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            Impresión de prueba
          </Link>
        </p>
        <SiiGeneralView summary={res.summary} />
      </BasicPageLayout>
    </SiiNarrowContent>
  );
}
