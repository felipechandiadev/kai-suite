import { BasicPageLayout } from "@/shared/components/layouts/BasicPageLayout";
import {
  getFiscalProfileAction,
  listFiscalCafsAction,
} from "@/features/fiscal/actions/fiscal.actions";
import { SiiCredentialsForm } from "@/features/fiscal/ui/SiiCredentialsForm";

export const dynamic = "force-dynamic";

export default async function SiiCredencialesPage() {
  const [profileRes, cafsRes] = await Promise.all([
    getFiscalProfileAction(),
    listFiscalCafsAction(),
  ]);

  if (!profileRes.success) {
    return (
      <BasicPageLayout title="Credenciales SII" subtitle="Certificado digital y CAF">
        <p className="text-sm text-destructive">{profileRes.error}</p>
      </BasicPageLayout>
    );
  }

  return (
    <BasicPageLayout
      title="Credenciales SII"
      subtitle="Certificado .pfx, CAF boleta 39 y prueba de token"
    >
      <SiiCredentialsForm
        profile={profileRes.fiscalProfile}
        cafs={cafsRes.success ? cafsRes.cafs : []}
      />
    </BasicPageLayout>
  );
}
