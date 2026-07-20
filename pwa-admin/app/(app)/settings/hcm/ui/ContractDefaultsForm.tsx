"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Select, TextField, type Option } from "@kai/ui";
import { updateJornadaConfigAction } from "@/features/hr-jornada/actions/jornada.action";
import type { JornadaConfigView } from "@/features/hr-jornada/types/jornada.types";
import { EXTRA_HOURS_MODE_LABELS } from "@/features/hr-employees/types/contract.types";
import { listShiftSystemsAction } from "@/features/hr-shift-systems/actions/shift-system.action";
import type { ShiftSystemView } from "@/features/hr-shift-systems/types/shift-system.types";

const REGIME_OPTIONS: Option[] = [
  { id: "ORDINARY", label: "Ordinario" },
  { id: "PARTIAL", label: "Parcial" },
  { id: "EXCEPTIONAL_ART38", label: "Excepcional (Art. 38)" },
];

const EXTRA_OPTIONS: Option[] = Object.entries(EXTRA_HOURS_MODE_LABELS).map(
  ([id, label]) => ({ id, label }),
);

export function ContractDefaultsForm({ config }: { config: JornadaConfigView }) {
  const router = useRouter();
  const [meal, setMeal] = useState(String(config.defaultMealAllowance ?? "0"));
  const [transport, setTransport] = useState(
    String(config.defaultTransportAllowance ?? "0"),
  );
  const [regime, setRegime] = useState(config.defaultWorkRegime ?? "ORDINARY");
  const [weeklyHours, setWeeklyHours] = useState(
    String(config.defaultWeeklyHours ?? "45"),
  );
  const [extraHoursMode, setExtraHoursMode] = useState(
    config.defaultExtraHoursMode ?? "PAID_OVERTIME",
  );
  const [defaultShiftSystemId, setDefaultShiftSystemId] = useState<string | null>(
    config.defaultShiftSystemId ?? null,
  );
  const [shiftSystems, setShiftSystems] = useState<ShiftSystemView[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    void listShiftSystemsAction(false).then((res) => {
      if (res.success) setShiftSystems(res.data);
    });
  }, []);

  const shiftOptions: Option[] = shiftSystems.map((s) => ({
    id: s.id,
    label: s.name,
  }));

  return (
    <div className="mx-auto w-full max-w-xl space-y-4" data-test-id="contract-defaults-form">
      <p className="text-sm text-muted-foreground">
        Valores por defecto al crear un nuevo contrato laboral.
      </p>
      {error ? <Alert variant="error">{error}</Alert> : null}
      {ok ? <Alert variant="success">Defaults guardados</Alert> : null}
      <TextField
        label="Colación por defecto (CLP)"
        value={meal}
        onChange={(e) => setMeal(e.target.value)}
      />
      <TextField
        label="Movilización por defecto (CLP)"
        value={transport}
        onChange={(e) => setTransport(e.target.value)}
      />
      <Select
        label="Régimen por defecto"
        options={REGIME_OPTIONS}
        value={regime}
        onChange={(id) => setRegime(String(id ?? "ORDINARY"))}
      />
      <TextField
        label="Horas semanales por defecto"
        type="number"
        value={weeklyHours}
        onChange={(e) => setWeeklyHours(e.target.value)}
      />
      <Select
        label="Horas extras / compensación por defecto"
        options={EXTRA_OPTIONS}
        value={extraHoursMode}
        onChange={(id) => setExtraHoursMode(String(id ?? "PAID_OVERTIME"))}
      />
      <Select
        label="Sistema de jornada por defecto"
        options={shiftOptions}
        value={defaultShiftSystemId}
        onChange={(id) =>
          setDefaultShiftSystemId(id != null ? String(id) : null)
        }
        allowClear
      />
      <Button
        variant="primary"
        disabled={pending}
        onClick={() => {
          setOk(false);
          startTransition(async () => {
            const res = await updateJornadaConfigAction({
              defaultMealAllowance: meal.trim() || "0",
              defaultTransportAllowance: transport.trim() || "0",
              defaultWorkRegime: regime,
              defaultWeeklyHours: weeklyHours.trim() || "45",
              defaultExtraHoursMode: extraHoursMode,
              defaultShiftSystemId,
            });
            if (!res.success) {
              setError(res.message);
              return;
            }
            setOk(true);
            router.refresh();
          });
        }}
      >
        Guardar defaults
      </Button>
    </div>
  );
}
