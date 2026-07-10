"use client";

import { useState } from "react";
import { Stepper } from "@kai/ui";
import type { StepperStepItem } from "@kai/ui";
import { Button } from "@kai/ui";

const DEMO_STEPS: StepperStepItem[] = [
  { id: "a", title: "Primer paso", description: "Descripción de ejemplo para el paso 1." },
  { id: "b", title: "Segundo paso", description: "Otro texto de ayuda visible en el panel." },
  { id: "c", title: "Tercer paso", description: "Último paso de la demo." },
];

export default function StepperUiPage() {
  const [active, setActive] = useState(0);
  const last = DEMO_STEPS.length - 1;

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">Stepper</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Indicador visual de pasos para flujos tipo asistente. El contenido y la navegación los
        define el contenedor (p. ej. editor de promociones).
      </p>

      <div className="mt-8 rounded-xl border border-border bg-card p-6 shadow-sm">
        <Stepper
          steps={DEMO_STEPS}
          activeIndex={active}
          allowClickCompletedSteps
          onCompletedStepClick={setActive}
          footer={
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outlinedSecondary"
                disabled={active <= 0}
                onClick={() => setActive((i) => Math.max(0, i - 1))}
              >
                Atrás
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={active >= last}
                onClick={() => setActive((i) => Math.min(last, i + 1))}
              >
                Siguiente
              </Button>
            </div>
          }
          data-test-id="ui-stepper-demo"
        >
          <p className="text-sm text-foreground">
            Contenido del paso <strong>{active + 1}</strong> ({DEMO_STEPS[active]?.id}).
          </p>
        </Stepper>
      </div>
    </div>
  );
}
