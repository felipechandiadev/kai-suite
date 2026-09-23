import { useState } from "react";
import { Alert, Button, TextField } from "@kai/ui";
import { APP_CONFIG } from "@/config/app.config";
import { toUserMessage } from "@/lib/errors";
import { useAuth } from "@/providers/AuthProvider";
import { resumeOpenCashSession } from "@/sections/pos/lib/resolve-open-session";
import { usePosCartStore } from "@/sections/pos/store/pos-cart.store";
import { useSectionStore } from "@/shell/section-state.store";

export function AppLoginPage() {
  const { login } = useAuth();
  const setActive = useSectionStore((s) => s.setActive);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      usePosCartStore.getState().setSessionBootstrap("pending");
      try {
        await resumeOpenCashSession({ retries: 3 });
      } catch {
        usePosCartStore.getState().setSessionBootstrap("ready");
        usePosCartStore.getState().setPhase("opening");
      }
      setActive("pos");
    } catch (err) {
      setError(toUserMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="flex h-full min-h-0 items-start justify-center bg-background pt-[12vh]"
      data-test-id="app-login"
    >
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex flex-col items-center gap-3 text-center">
          <img
            src="/kai-store-lite.png"
            alt=""
            width={72}
            height={72}
            className="h-16 w-16 object-contain"
            draggable={false}
          />
          <h1 className="text-xl font-semibold text-foreground">{APP_CONFIG.productName}</h1>
        </div>
        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3">
          <TextField
            label="Usuario"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            data-test-id="app-login-user"
          />
          <TextField
            label="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            data-test-id="app-login-password"
          />
          {error ? <Alert variant="error">{error}</Alert> : null}
          <Button type="submit" disabled={busy} fullWidth data-test-id="app-login-submit">
            {busy ? "…" : "Entrar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
