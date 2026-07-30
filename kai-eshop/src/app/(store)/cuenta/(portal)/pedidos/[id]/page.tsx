import Link from "next/link";
import { notFound } from "next/navigation";
import { getCustomerSessionToken } from "@/lib/eshop-customer-session";
import { EShopCustomerAccountRequest } from "@/features/e-shop-customer-account/infrastructure/customer-account.request";

function fmt(n: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n);
}

export default async function CuentaPedidoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const token = await getCustomerSessionToken();
  if (!token) return null;

  let order;
  try {
    order = await EShopCustomerAccountRequest.getOrder(token, id);
  } catch {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/cuenta/pedidos" className="text-sm text-primary hover:underline">
          ← Volver a pedidos
        </Link>
        <h2 className="mt-2 text-lg font-semibold">Pedido {order.documentNumber}</h2>
        <p className="text-sm text-muted-foreground">{order.fulfillmentStatus}</p>
      </div>

      <section>
        <h3 className="mb-2 text-sm font-semibold">Productos</h3>
        <ul className="space-y-1 text-sm">
          {order.lines.map((l) => (
            <li key={l.id} className="flex justify-between gap-2">
              <span>
                {l.productName} × {l.quantity}
              </span>
              <span>{fmt(l.total)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-sm font-medium">Total: {fmt(order.total)}</p>
      </section>

      {(order.statusHistory ?? []).length > 0 ? (
        <section>
          <h3 className="mb-2 text-sm font-semibold">Seguimiento</h3>
          <ol className="space-y-2 border-l border-border pl-3 text-sm">
            {order.statusHistory.map((h, i) => (
              <li key={`${h.at}-${i}`}>
                <span className="font-medium">{h.status}</span>
                <span className="text-muted-foreground">
                  {" "}
                  — {new Date(h.at).toLocaleString("es-CL")}
                </span>
                {h.note ? <p className="text-muted-foreground">{h.note}</p> : null}
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
