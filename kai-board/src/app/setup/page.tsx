"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ButtonPill, TextField } from "@kai/ui";
import { validateBoardDisplayTokenAction } from "@/features/board/actions/board.action";
import { saveBoardDisplayToken } from "@/lib/board-display-storage";

export default function BoardSetupPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = token.replace(/\D/g, "");
    if (trimmed.length !== 6) {
      setError("Ingrese el código de 6 dígitos de la pantalla.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await validateBoardDisplayTokenAction(trimmed);
    setBusy(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    saveBoardDisplayToken(trimmed);
    router.replace("/board");
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center gap-6 bg-background/80 p-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Kai Board</h1>
        <p className="mt-2 text-muted-foreground">
          Sin login. Ingrese el código de 6 dígitos generado en el POS (Ajustes →
          Kai Board) para vincular este monitor a la sucursal.
        </p>
      </div>
      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-4 rounded-2xl border border-border bg-surface/80 p-5 shadow-lg shadow-black/40"
      >
        <TextField
          label="Código de pantalla (6 dígitos)"
          name="displayToken"
          value={token}
          onChange={(e) =>
            setToken(e.target.value.replace(/\D/g, "").slice(0, 6))
          }
          inputMode="numeric"
          required
          data-test-id="board-setup-token"
        />
        {error ? (
          <p className="text-sm text-error" data-test-id="board-setup-error">
            {error}
          </p>
        ) : null}
        <div className="flex justify-between gap-3">
          <Button
            type="button"
            variant="outlined"
            onClick={() => setToken("")}
            disabled={busy}
          >
            Limpiar
          </Button>
          <ButtonPill
            type="submit"
            disabled={busy}
            data-test-id="board-setup-submit"
          >
            {busy ? "Validando…" : "Vincular monitor"}
          </ButtonPill>
        </div>
      </form>
    </main>
  );
}
