import { BasicPageLayout } from "@kai/ui";
import { getFiscalProfileAction } from "@/features/fiscal/actions/fiscal.actions";
import { SiiDocumentosForm } from "@/features/fiscal/ui/SiiDocumentosForm";
import { SiiNarrowContent } from "@/features/fiscal/ui/SiiNarrowContent";
import { normalizeFiscalDocumentFamilies } from "@/features/fiscal/types/fiscal-document-family";

export const dynamic = "force-dynamic";

export default async function SiiDocumentosPage() {
  const profileRes = await getFiscalProfileAction();

  if (!profileRes.success) {
    return (
      <SiiNarrowContent>
        <BasicPageLayout title="Documentos SII" subtitle="Familias DTE habilitadas">
          <p className="text-sm text-destructive">{profileRes.error}</p>
        </BasicPageLayout>
      </SiiNarrowContent>
    );
  }

  const families = normalizeFiscalDocumentFamilies(
    profileRes.fiscalProfile.enabledDocumentFamilies,
  );

  return (
    <SiiNarrowContent>
      <BasicPageLayout
        title="Documentos SII"
        subtitle="Seleccione qué tipos de documentos electrónicos usará esta empresa"
      >
        <SiiDocumentosForm initial={families} />
      </BasicPageLayout>
    </SiiNarrowContent>
  );
}
