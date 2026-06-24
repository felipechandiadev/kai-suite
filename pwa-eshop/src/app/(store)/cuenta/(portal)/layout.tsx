import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutCustomerAction } from "@/features/e-shop-customer-account/actions/customer-account.action";
import { requireCustomerPortalSession } from "@/features/e-shop-customer-account/lib/customer-portal-session";
import { CustomerAccountNav } from "@/features/e-shop-customer-account/ui/CustomerAccountNav";
import { StorePageShell } from "@/shared/components/StorePageShell";

export default async function CuentaLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireCustomerPortalSession("/cuenta");
  const email = profile.email;
  const emailVerified = profile.emailVerified;

  return (
    <StorePageShell>
      <h1 className="mb-4 text-2xl font-semibold">Mi cuenta</h1>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{email}</p>
        <form
          action={async () => {
            "use server";
            await logoutCustomerAction();
            redirect("/cuenta/login");
          }}
        >
          <button type="submit" className="text-sm text-primary hover:underline">
            Cerrar sesión
          </button>
        </form>
      </div>
      {!emailVerified ? (
        <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
          Tu correo aún no está verificado. Revisa tu bandeja o{" "}
          <Link href="/cuenta/verificacion-pendiente" className="font-medium underline">
            instrucciones de verificación
          </Link>
          . Pagos y deudas requieren verificación.
        </div>
      ) : null}
      <CustomerAccountNav />
      <div className="mt-6">{children}</div>
    </StorePageShell>
  );
}
