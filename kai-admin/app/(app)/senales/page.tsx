import { BasicPageLayout } from "@kai/ui";
import { getSignalsBoardAction } from "@/features/business-signals/actions/signals.action";
import { SignalsBoardView } from "@/features/business-signals/ui/SignalsBoard";

export default async function SenalesPage() {
  const board = await getSignalsBoardAction();

  return (
    <BasicPageLayout
      title="Indicadores · Señales"
      subtitle="Excepciones y siguiente paso — no un resumen de lo que ya pasó."
      data-test-id="senales-page"
    >
      <SignalsBoardView board={board} />
    </BasicPageLayout>
  );
}
