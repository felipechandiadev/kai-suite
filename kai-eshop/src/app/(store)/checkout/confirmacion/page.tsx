import Link from "next/link";
import { ClearCartOnOrderSuccess } from "./ClearCartOnOrderSuccess";
import { getCustomerSessionToken } from "@/lib/eshop-customer-session";
import { getCustomerPortalStorefront } from "@/features/e-shop-customer-account/lib/customer-portal-storefront";
import { CustomerPortalAuthBanner } from "@/features/e-shop-customer-account/ui/CustomerPortalAuthBanner";

export default async function ConfirmacionPage({
  searchParams,
}: {
  searchParams: Promise<{ doc?: string; method?: string; encargo?: string; orderId?: string; email?: string; paid?: string }>;
}) {
  const { doc, method, encargo, orderId, email, paid } = await searchParams;
  const isEncargo = encargo === "1";
  const isPaid = paid === "1";
  const sessionToken = await getCustomerSessionToken();
  const storefront = await getCustomerPortalStorefront();
  const portalEnabled = storefront.eShopCustomerPortalEnabled === true;

  return (
    <div className="mx-auto max-w-lg space-y-4 text-center py-12">
      <ClearCartOnOrderSuccess documentNumber={doc} orderId={orderId} />
      <h1 className="text-2xl font-semibold text-success">
        {isPaid ? "Pago confirmado" : "Pedido registrado"}
      </h1>
      <p className="text-muted-foreground">
        Número de documento: <strong className="text-foreground">{doc ?? "—"}</strong>
      </p>
      {orderId ? (
        <p className="text-sm text-muted-foreground">
          Pedido: <strong className="text-foreground font-mono text-xs">{orderId}</strong>
        </p>
      ) : null}
      {method ? (
        <p className="text-sm text-muted-foreground">
          Método de entrega: <strong className="text-foreground">{method}</strong>
        </p>
      ) : null}
      {isEncargo ? (
        <p className="text-sm text-amber-700 dark:text-amber-400">
          Algunos productos se registraron como encargo por disponibilidad de stock.
        </p>
      ) : null}
      <p className="text-sm text-muted-foreground">
        {isPaid
          ? "Tu pago fue procesado. Te contactaremos para coordinar la entrega."
          : "Te contactaremos para coordinar el pago y la entrega."}
      </p>
      <div className="space-y-4 text-left">
        <CustomerPortalAuthBanner
          customerPortalEnabled={portalEnabled}
          suggestedEmail={email}
          orderId={orderId}
        />
      </div>
      <div className="flex flex-col items-center gap-2">
        {sessionToken && orderId ? (
          <Link href={`/cuenta/pedidos/${orderId}`} className="text-sm text-primary hover:underline">
            Ver en Mi cuenta
          </Link>
        ) : null}
        <Link href="/" className="text-sm text-primary hover:underline">
          Volver a la tienda
        </Link>
      </div>
    </div>
  );
}
