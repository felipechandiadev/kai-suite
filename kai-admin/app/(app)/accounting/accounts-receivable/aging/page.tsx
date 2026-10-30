import { AgingRequest } from "@/features/accounting-aging/infrastructure/aging.request";
import AgingBoard from "@/features/accounting-aging/ui/AgingBoard";

export const dynamic = "force-dynamic";

export default async function AgingReceivablePage() {
  const report = await AgingRequest.get("receivable");
  return (
    <div className="flex min-h-0 flex-1 flex-col p-0" data-test-id="accounting-accounts-receivable-aging-page">
      <AgingBoard kind="receivable" report={report} />
    </div>
  );
}
