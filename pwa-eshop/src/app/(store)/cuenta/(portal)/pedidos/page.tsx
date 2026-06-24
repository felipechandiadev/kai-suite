import Link from "next/link";
import { getCustomerSessionToken } from "@/lib/eshop-customer-session";
import { EShopCustomerAccountRequest } from "@/features/e-shop-customer-account/infrastructure/customer-account.request";

function fmt(n: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n);
}

const TX_LABEL: Record<string, string> = {
  BACKORDER: "Encargo",
  CUSTOMER_ORDER: "Pedido",
  SALE: "Venta",
};

export default async function CuentaPedidosPage() {
  const token = await getCustomerSessionToken();
  if (!token) return null;
  const { data } = await EShopCustomerAccountRequest.listOrders(token);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Mis pedidos</h2>
      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay pedidos registrados.</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {data.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
              <div>
                <Link href={`/cuenta/pedidos/${o.id}`} className="font-medium text-primary hover:underline">
                  {o.documentNumber}
                </Link>
                <p className="text-muted-foreground">
                  {TX_LABEL[o.transactionType] ?? o.transactionType} · {o.fulfillmentStatus}
                </p>
              </div>
              <div className="text-right">
                <p>{fmt(o.total)}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(o.createdAt).toLocaleDateString("es-CL")}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
