import { AgingRequest } from "@/features/accounting-aging/infrastructure/aging.request";
import AgingBoard from "@/features/accounting-aging/ui/AgingBoard";

export const dynamic = "force-dynamic";

export default async function AgingPayablePage() {
  const report = await AgingRequest.get("payable");
  return (
    <div className="flex min-h-0 flex-1 flex-col p-0" data-test-id="accounting-accounts-payable-aging-page">
      <AgingBoard kind="payable" report={report} />
    </div>
  );
}
