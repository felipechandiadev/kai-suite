import Link from "next/link";
import { StorePageShell } from "@/shared/components/StorePageShell";

export function CustomerPortalDisabledMessage() {
  return (
    <StorePageShell>
      <div className="mx-auto max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-semibold">Mi cuenta no disponible</h1>
        <p className="text-sm text-muted-foreground">
          El portal de cliente no está habilitado en esta tienda. Podés completar tu compra como
          invitado, sin crear una cuenta.
        </p>
        <Link href="/" className="text-sm text-primary hover:underline">
          Volver a la tienda
        </Link>
      </div>
    </StorePageShell>
  );
}
