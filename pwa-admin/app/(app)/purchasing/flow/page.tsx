import { BasicPageLayout } from "@kai/ui";
import { PurchasingUiFlowDiagram } from "./ui/PurchasingUiFlowDiagram";

export default function PurchasingFlowPage() {
  return (
    <BasicPageLayout
      title="Flujo del proceso de compras"
      subtitle="Diagrama orientado a la experiencia en el PWA Admin y a las transacciones que respaldan cada paso."
      className="min-h-0"
      data-test-id="purchasing-flow-page"
    >
      <PurchasingUiFlowDiagram />
    </BasicPageLayout>
  );
}
