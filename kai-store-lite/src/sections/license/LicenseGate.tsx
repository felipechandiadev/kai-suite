import { APP_CONFIG } from "@/config/app.config";
import { useLicense } from "@/providers/LicenseProvider";
import { ActivateLicenseForm } from "./ActivateLicenseForm";

export function LicenseGate({ children }: { children: React.ReactNode }) {
  const { status, loading, isAllowed } = useLicense();

  if (loading) {
    return null;
  }

  if (isAllowed) return <>{children}</>;

  return (
    <div
      className="mx-auto mt-12 w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-sm"
      data-test-id="license-gate"
    >
      <h1 className="text-xl font-semibold text-foreground">{APP_CONFIG.productName}</h1>
      <p className="mt-2 mb-6 text-sm text-muted-foreground">
        {status.kind === "expired"
          ? "El período de prueba terminó. Ingresá un código de activación para continuar en este equipo."
          : "Ingresá el código de activación para usar KaiStore Lite en este equipo. Queda vinculado a esta máquina."}
      </p>
      <ActivateLicenseForm />
    </div>
  );
}
