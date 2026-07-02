import { BasicPageLayout } from "@/shared/components/layouts/BasicPageLayout";
import { getFiscalProfileAction } from "@/features/fiscal/actions/fiscal.actions";
import { SiiCredentialsForm } from "@/features/fiscal/ui/SiiCredentialsForm";
import { SiiNarrowContent } from "@/features/fiscal/ui/SiiNarrowContent";

export const dynamic = "force-dynamic";

export default async function SiiCredencialesPage() {
  const profileRes = await getFiscalProfileAction();

  if (!profileRes.success) {
    return (
      <SiiNarrowContent>
        <BasicPageLayout title="Credenciales SII" subtitle="Certificado digital">
          <p className="text-sm text-destructive">{profileRes.error}</p>
        </BasicPageLayout>
      </SiiNarrowContent>
    );
  }

  return (
    <SiiNarrowContent>
      <BasicPageLayout
        title="Credenciales SII"
        subtitle="Certificado .pfx y prueba de token"
      >
        <SiiCredentialsForm profile={profileRes.fiscalProfile} />
      </BasicPageLayout>
    </SiiNarrowContent>
  );
}
