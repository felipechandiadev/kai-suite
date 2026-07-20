"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, TextField, Switch } from "@kai/ui";
import { updateJornadaConfigAction } from "@/features/hr-jornada/actions/jornada.action";
import type { JornadaConfigView } from "@/features/hr-jornada/types/jornada.types";

export function JornadaSettingsForm({ config }: { config: JornadaConfigView }) {
  const router = useRouter();
  const [form, setForm] = useState(config);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof JornadaConfigView>(key: K, value: JornadaConfigView[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <div className="max-w-xl space-y-4" data-test-id="jornada-settings">
      {error ? <Alert variant="error">{error}</Alert> : null}
      {ok ? <Alert variant="success">Parámetros guardados</Alert> : null}
      <TextField
        label="Horas ordinarias mensuales (valor-hora)"
        type="number"
        value={String(form.monthlyOrdinaryHours)}
        onChange={(e) => set("monthlyOrdinaryHours", Number(e.target.value) || 180)}
      />
      <TextField
        label="Multiplicador HE"
        value={String(form.overtimeMultiplier)}
        onChange={(e) => set("overtimeMultiplier", e.target.value)}
      />
      <TextField
        label="Máx. HE diarias (minutos)"
        type="number"
        value={String(form.maxDailyOvertimeMinutes)}
        onChange={(e) =>
          set("maxDailyOvertimeMinutes", Number(e.target.value) || 120)
        }
      />
      <TextField
        label="Descanso mínimo entre jornadas (minutos)"
        type="number"
        value={String(form.minRestBetweenShiftsMinutes)}
        onChange={(e) =>
          set("minRestBetweenShiftsMinutes", Number(e.target.value) || 660)
        }
      />
      <TextField
        label="Inicio noche (HH:mm)"
        value={form.nightStart}
        onChange={(e) => set("nightStart", e.target.value)}
      />
      <TextField
        label="Fin noche (HH:mm)"
        value={form.nightEnd}
        onChange={(e) => set("nightEnd", e.target.value)}
      />
      <TextField
        label="Tope semanal (minutos, vacío = sin tope)"
        value={form.maxWeeklyMinutes != null ? String(form.maxWeeklyMinutes) : ""}
        onChange={(e) =>
          set(
            "maxWeeklyMinutes",
            e.target.value.trim() ? Number(e.target.value) : null,
          )
        }
      />
      <TextField
        label="Caducidad bolsa (días, vacío = sin caducidad)"
        value={
          form.compensatoryExpiryDays != null
            ? String(form.compensatoryExpiryDays)
            : ""
        }
        onChange={(e) =>
          set(
            "compensatoryExpiryDays",
            e.target.value.trim() ? Number(e.target.value) : null,
          )
        }
      />
      <div className="flex items-center gap-2">
        <Switch
          checked={form.allowShiftOverlap}
          onChange={(v) => set("allowShiftOverlap", v)}
        />
        <span className="text-sm text-foreground">Permitir solapamiento de turnos</span>
      </div>
      <Button
        variant="primary"
        disabled={pending}
        onClick={() => {
          setOk(false);
          startTransition(async () => {
            const res = await updateJornadaConfigAction({
              monthlyOrdinaryHours: form.monthlyOrdinaryHours,
              overtimeMultiplier: form.overtimeMultiplier,
              maxDailyOvertimeMinutes: form.maxDailyOvertimeMinutes,
              minRestBetweenShiftsMinutes: form.minRestBetweenShiftsMinutes,
              nightStart: form.nightStart,
              nightEnd: form.nightEnd,
              maxWeeklyMinutes: form.maxWeeklyMinutes,
              compensatoryExpiryDays: form.compensatoryExpiryDays,
              allowShiftOverlap: form.allowShiftOverlap,
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
        Guardar parámetros
      </Button>
    </div>
  );
}
