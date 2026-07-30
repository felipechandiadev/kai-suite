import Link from "next/link";
import { StorePageShell } from "@/shared/components/StorePageShell";

export default function VerificacionPendientePage() {
  return (
    <StorePageShell>
      <div className="mx-auto max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-semibold">Revisa tu correo</h1>
        <p className="text-sm text-muted-foreground">
          Te enviamos un enlace para verificar tu cuenta. Hasta entonces podés ver pedidos y editar tu
          perfil; pagos y deudas requieren correo verificado.
        </p>
        <p className="text-xs text-muted-foreground">
          Si no llega el correo, revisa spam o solicita un nuevo enlace desde Mi cuenta.
        </p>
        <Link href="/cuenta" className="inline-block text-sm text-primary hover:underline">
          Ir a Mi cuenta
        </Link>
      </div>
    </StorePageShell>
  );
}
