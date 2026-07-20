"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Select, TextField, type Option } from "@kai/ui";
import { updateJornadaConfigAction } from "@/features/hr-jornada/actions/jornada.action";
import type { JornadaConfigView } from "@/features/hr-jornada/types/jornada.types";

const REGIME_OPTIONS: Option[] = [
  { id: "ORDINARY", label: "Ordinario" },
  { id: "PARTIAL", label: "Parcial" },
  { id: "EXCEPTIONAL", label: "Excepcional" },
];

export function ContractDefaultsForm({ config }: { config: JornadaConfigView }) {
  const router = useRouter();
  const [meal, setMeal] = useState(String(config.defaultMealAllowance ?? "0"));
  const [transport, setTransport] = useState(
    String(config.defaultTransportAllowance ?? "0"),
  );
  const [regime, setRegime] = useState(config.defaultWorkRegime ?? "ORDINARY");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div className="max-w-xl space-y-4" data-test-id="contract-defaults-form">
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
