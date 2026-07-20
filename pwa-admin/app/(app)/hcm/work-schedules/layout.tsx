import type { ReactNode } from "react";
import { TabPageLayout } from "@kai/ui/components/layouts/TabPageLayout";
import { JornadaTabs } from "./JornadaTabs";

export default function JornadaLayout({ children }: { children: ReactNode }) {
  return (
    <TabPageLayout
      title="Jornadas"
      subtitle="Planificación de turnos, cumplimiento normativo y asistencia por excepción"
      tabs={<JornadaTabs />}
      compact
      data-test-id="hr-jornada-layout"
    >
      {children}
    </TabPageLayout>
  );
}
