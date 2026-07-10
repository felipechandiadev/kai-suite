import { BasicPageLayout } from "@kai/ui";
import { getFiscalProfileAction } from "@/features/fiscal/actions/fiscal.actions";
import { companyToEmisorForm } from "@/features/fiscal/types/fiscal.types";
import { SiiEmisorForm } from "@/features/fiscal/ui/SiiEmisorForm";
import { SiiNarrowContent } from "@/features/fiscal/ui/SiiNarrowContent";
import { getCompanyDetailsAction } from "@/features/settings-company/actions/company.action";

export const dynamic = "force-dynamic";

export default async function SiiEmisorPage() {
  const [company, profileRes] = await Promise.all([
    getCompanyDetailsAction(),
    getFiscalProfileAction(),
  ]);

  if (!company) {
    return (
      <SiiNarrowContent>
        <BasicPageLayout title="Emisor SII" subtitle="Datos del contribuyente y resolución">
          <p className="text-sm text-destructive">No se encontró la empresa activa.</p>
        </BasicPageLayout>
      </SiiNarrowContent>
    );
  }

  if (!profileRes.success) {
    return (
      <SiiNarrowContent>
        <BasicPageLayout title="Emisor SII" subtitle="Datos del contribuyente y resolución">
          <p className="text-sm text-destructive">{profileRes.error}</p>
        </BasicPageLayout>
      </SiiNarrowContent>
    );
  }

  return (
    <SiiNarrowContent>
      <BasicPageLayout
        title="Emisor SII"
        subtitle="Razón social, giro, dirección y resolución de boletas (guardado en la empresa)"
      >
        <SiiEmisorForm initial={companyToEmisorForm(company, profileRes.fiscalProfile)} />
      </BasicPageLayout>
    </SiiNarrowContent>
  );
}
