import { BasicPageLayout } from "@kai/ui";
import { getSignalsBoardAction } from "@/features/business-signals/actions/signals.action";
import { SignalsBoardView } from "@/features/business-signals/ui/SignalsBoard";

export default async function AnalyticsSignalsPage() {
  const board = await getSignalsBoardAction();

  return (
    <BasicPageLayout
      title="Señales"
      subtitle="Excepciones y siguiente paso — no un resumen de lo que ya pasó."
      data-test-id="analytics-signals-page"
    >
      <SignalsBoardView board={board} />
    </BasicPageLayout>
  );
}
