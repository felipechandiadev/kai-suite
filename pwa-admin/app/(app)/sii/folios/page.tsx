import { Alert } from "@kai/ui";
import {
  listFiscalCafPackagesAction,
  listFiscalEmissionsAction,
} from "@/features/fiscal/actions/fiscal.actions";
import { listPointsOfSaleForPage } from "@/features/sales-points-of-sale/actions/point-of-sale.action";
import { getFiscalProfileAction } from "@/features/fiscal/actions/fiscal.actions";
import { SiiFoliosView } from "@/features/fiscal/ui/SiiFoliosView";
import { SiiFamilyTabsLinks } from "@/features/fiscal/ui/SiiFamilyTabsNav";
import { BasicPageLayout } from "@kai/ui";
import { SiiNarrowContent } from "@/features/fiscal/ui/SiiNarrowContent";
import {
  FISCAL_DOCUMENT_FAMILY_META,
  normalizeFiscalDocumentFamilies,
  resolveActiveFamilyTab,
} from "@/features/fiscal/types/fiscal-document-family";
import { SII_FOLIOS } from "@/navigation/sii-routes";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ tab?: string; package?: string }>;
};

export default async function SiiFoliosPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const highlightPackageId = params.package?.trim() || null;

  const [packagesRes, emissionsRes, pointsOfSale, profileRes] = await Promise.all([
    listFiscalCafPackagesAction(),
    listFiscalEmissionsAction({ limit: 25, offset: 0, environment: "production" }),
    listPointsOfSaleForPage(),
    getFiscalProfileAction(),
  ]);

  if (!profileRes.success) {
    return (
      <SiiNarrowContent>
        <BasicPageLayout title="Folios SII" subtitle="CAF y asignaciones">
          <p className="text-sm text-destructive">{profileRes.error}</p>
        </BasicPageLayout>
      </SiiNarrowContent>
    );
  }

  const families = normalizeFiscalDocumentFamilies(
    profileRes.fiscalProfile.enabledDocumentFamilies,
  );
  const activeTab = resolveActiveFamilyTab(params.tab, families);
  const meta = FISCAL_DOCUMENT_FAMILY_META.find((m) => m.tab === activeTab)!;

  if (!emissionsRes.success) {
    return (
      <SiiNarrowContent>
        <BasicPageLayout title="Folios SII" subtitle="CAF y asignaciones">
          <p className="text-sm text-destructive">{emissionsRes.error}</p>
        </BasicPageLayout>
      </SiiNarrowContent>
    );
  }

  const packages = packagesRes.success ? (packagesRes.packages ?? []) : [];
  const packagesError = !packagesRes.success ? packagesRes.error : null;
  const filteredPackages = packages.filter((p) => p.dteType === meta.dteType);

  return (
    <SiiNarrowContent>
      <BasicPageLayout title="Folios SII" subtitle={`CAF y rangos — ${meta.label}`}>
        <div className="space-y-4">
          <SiiFamilyTabsLinks families={families} activeTab={activeTab} basePath={SII_FOLIOS} />
          {packagesError ? (
            <p className="text-sm text-destructive">{packagesError}</p>
          ) : null}
          {activeTab !== "boleta" ? (
            <Alert variant="info">
              Emisión de {meta.label} en POS aún no está implementada. Puede cargar y administrar
              CAF tipo {meta.dteType} para certificación y producción futura.
            </Alert>
          ) : null}
          <SiiFoliosView
            dteType={meta.dteType}
            documentLabel={meta.label}
            showPosAllocations={activeTab === "boleta"}
            showEmissions={activeTab === "boleta"}
            packages={filteredPackages}
            pointsOfSale={pointsOfSale ?? []}
            highlightPackageId={highlightPackageId}
            initialEmissions={emissionsRes.items}
            initialTotal={emissionsRes.total}
          />
        </div>
      </BasicPageLayout>
    </SiiNarrowContent>
  );
}
