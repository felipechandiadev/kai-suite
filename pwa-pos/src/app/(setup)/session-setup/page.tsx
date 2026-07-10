export const dynamic = "force-dynamic";

import { listPointsOfSaleForSetup } from "@/features/session/actions/session-setup.action";
import SessionSetupForm from "./SessionSetupForm";

export default async function Page() {
  const points = await listPointsOfSaleForSetup();
  const pointsOfSale = points.success ? points.pointsOfSale : [];

  return (
    <div>
      <SessionSetupForm
        pointsOfSale={pointsOfSale}
        initialError={points.success ? "" : points.error}
      />
    </div>
  );
}
