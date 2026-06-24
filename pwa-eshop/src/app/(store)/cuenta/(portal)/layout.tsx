import Link from "next/link";
import { redirect } from "next/navigation";

async function requireCustomerSession() {
  const token = await getCustomerSessionToken();
  if (!token) redirect("/cuenta/login?next=/cuenta");
  return token;
}

export default async function CuentaLayout({ children }: { children: React.ReactNode }) {
  const token = await requireCustomerSession();
  let email = "";
  try {
    const profile = await EShopCustomerAccountRequest.getProfile(token);
    email = profile.email;
  } catch {
    redirect("/cuenta/login?next=/cuenta");
  }

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
      <CustomerAccountNav />
      <div className="mt-6">{children}</div>
    </StorePageShell>
  );
}
