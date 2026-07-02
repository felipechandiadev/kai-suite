import {
  listFiscalCafsAction,
  listFiscalEmissionsAction,
} from "@/features/fiscal/actions/fiscal.actions";
import { SiiFoliosView } from "@/features/fiscal/ui/SiiFoliosView";

export const dynamic = "force-dynamic";

export default async function SiiFoliosPage() {
  const [cafsRes, emissionsRes] = await Promise.all([
    listFiscalCafsAction(),
    listFiscalEmissionsAction({ limit: 25, offset: 0, environment: "production" }),
  ]);

  if (!emissionsRes.success) {
    return (
      <div className="min-h-0 p-0" data-test-id="settings-sii-folios-page-root">
        <p className="p-4 text-sm text-destructive">{emissionsRes.error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-0 p-0" data-test-id="settings-sii-folios-page-root">
      <SiiFoliosView
        cafs={cafsRes.success ? cafsRes.cafs : []}
        initialEmissions={emissionsRes.items}
        initialTotal={emissionsRes.total}
      />
    </div>
  );
}
