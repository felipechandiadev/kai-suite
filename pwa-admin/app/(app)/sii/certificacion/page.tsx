import { BasicPageLayout } from "@kai/ui";
import { getFiscalSummaryAction, getFiscalProfileAction } from "@/features/fiscal/actions/fiscal.actions";
import { SiiCertificationWizard } from "@/features/fiscal/ui/SiiCertificationWizard";
import { SiiFamilyTabsLinks } from "@/features/fiscal/ui/SiiFamilyTabsNav";
import { SiiNarrowContent } from "@/features/fiscal/ui/SiiNarrowContent";
import { SiiSoapCertificationPlaceholder } from "@/features/fiscal/ui/SiiSoapCertificationPlaceholder";
import {
  FISCAL_DOCUMENT_FAMILY_META,
  normalizeFiscalDocumentFamilies,
  resolveActiveFamilyTab,
} from "@/features/fiscal/types/fiscal-document-family";
import { SII_CERTIFICACION } from "@/navigation/sii-routes";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ tab?: string }>;
};

export default async function SiiCertificacionPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const [summaryRes, profileRes] = await Promise.all([
    getFiscalSummaryAction(),
    getFiscalProfileAction(),
  ]);

  if (!summaryRes.success || !profileRes.success) {
    let err = "Error al cargar datos fiscales";
    if (!summaryRes.success) err = summaryRes.error;
    else if (!profileRes.success) err = profileRes.error;
    return (
      <SiiNarrowContent>
        <BasicPageLayout title="Certificación SII" subtitle="Set de prueba y validación portal">
          <p className="text-sm text-destructive">{err}</p>
        </BasicPageLayout>
      </SiiNarrowContent>
    );
  }

  const families = normalizeFiscalDocumentFamilies(
    profileRes.fiscalProfile.enabledDocumentFamilies,
  );
  const activeTab = resolveActiveFamilyTab(params.tab, families);
  const meta = FISCAL_DOCUMENT_FAMILY_META.find((m) => m.tab === activeTab)!;

  return (
    <SiiNarrowContent>
      <BasicPageLayout
        title="Certificación SII"
        subtitle={`${meta.label} — ambiente de certificación y portal SII`}
      >
        <div className="space-y-4">
          <SiiFamilyTabsLinks
            families={families}
            activeTab={activeTab}
            basePath={SII_CERTIFICACION}
          />
          {activeTab === "boleta" ? (
            <SiiCertificationWizard summary={summaryRes.summary} />
          ) : (
            <SiiSoapCertificationPlaceholder
              documentLabel={meta.label}
              dteType={meta.dteType}
            />
          )}
        </div>
      </BasicPageLayout>
    </SiiNarrowContent>
  );
}
