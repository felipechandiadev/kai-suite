import { useState } from "react";
import { Alert, Button } from "@kai/ui";
import { liteFetch } from "@/lib/lite-client";
import { toUserMessage } from "@/lib/errors";

/** Runs POST /lite/seed and shows status (About / Users / settings). */
export function SeedActionButton({ label = "Ejecutar seed mínimo" }: { label?: string }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function runSeed() {
    setBusy(true);
    setMsg(null);
    setError(null);
    try {
      const res = await liteFetch<{ message: string; adminUserName?: string }>("/lite/seed", {
        method: "POST",
        skipAuth: true,
      });
      setMsg(res.message + (res.adminUserName ? ` · user ${res.adminUserName}` : ""));
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 flex flex-col gap-2">
      <div>
        <Button type="button" disabled={busy} onClick={() => void runSeed()}>
          {busy ? "…" : label}
        </Button>
      </div>
      {msg ? <Alert variant="success">{msg}</Alert> : null}
      {error ? <Alert variant="error">{error}</Alert> : null}
    </div>
  );
}
