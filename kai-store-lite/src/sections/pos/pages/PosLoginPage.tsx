import { useState } from "react";
import { Alert, Button, TextField } from "@kai/ui";
import { useAuth } from "@/providers/AuthProvider";
import { toUserMessage } from "@/lib/errors";
import { usePosCartStore } from "../store/pos-cart.store";

export function PosLoginPage() {
  const { login } = useAuth();
  const setPhase = usePosCartStore((s) => s.setPhase);
  const [email, setEmail] = useState("admin");
  const [password, setPassword] = useState("admin1234");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      setPhase("opening");
    } catch (err) {
      setError(toUserMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="flex h-full items-start justify-center bg-background pt-[12vh]"
      data-test-id="pos-login"
    >
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-foreground">POS · Ingreso</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Seed: <code className="text-primary">admin</code> /{" "}
          <code className="text-primary">admin1234</code> ·{" "}
          <code className="text-primary">cajero</code> /{" "}
          <code className="text-primary">cajero1234</code>
        </p>
        <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-3">
          <TextField
            label="Usuario"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            data-test-id="pos-login-user"
          />
          <TextField
            label="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            data-test-id="pos-login-password"
          />
          {error ? <Alert variant="error">{error}</Alert> : null}
          <Button type="submit" disabled={busy} fullWidth data-test-id="pos-login-submit">
            {busy ? "…" : "Entrar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
