import { useState } from "react";
import { Alert, Button, TextField } from "@kai/ui";
import { useLicense } from "@/providers/LicenseProvider";

type Props = {
  /** Llamado tras activación exitosa. */
  onActivated?: () => void;
  submitLabel?: string;
};

export function ActivateLicenseForm({
  onActivated,
  submitLabel = "Activar",
}: Props) {
  const { activate } = useLicense();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function runActivate() {
    setError(null);
    setBusy(true);
    void activate(code)
      .then(() => {
        setCode("");
        onActivated?.();
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "No se pudo activar"),
      )
      .finally(() => setBusy(false));
  }

  return (
    <div className="space-y-3" data-test-id="activate-license-form">
      {error ? <Alert variant="error">{error}</Alert> : null}
      <TextField
        label="Código de activación"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="XXXX-XXXX"
        autoComplete="off"
        data-test-id="license-code"
        onKeyDown={(e) => {
          if (e.key === "Enter" && code.trim() && !busy) {
            e.preventDefault();
            runActivate();
          }
        }}
      />
      <Button
        type="button"
        fullWidth
        loading={busy}
        disabled={!code.trim()}
        data-test-id="license-activate"
        onClick={runActivate}
      >
        {submitLabel}
      </Button>
    </div>
  );
}
