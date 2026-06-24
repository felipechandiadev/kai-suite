import Link from "next/link";
import { getCustomerSummaryAction } from "@/features/e-shop-customer-account/actions/customer-account.action";

function fmt(n: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n);
}

export default async function CuentaResumenPage() {
  const result = await getCustomerSummaryAction();
  if (!result.success) return null;
  const summary = result.summary;

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-lg font-semibold">Hola, {summary.profile.firstName}</h2>
        {!summary.profile.emailVerified ? (
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
            Verifica tu correo para ver pagos y deudas.
          </p>
        ) : null}
      </section>

      {summary.openBackordersCount > 0 ? (
        <section className="rounded-lg border border-border p-4">
          <p className="text-sm">
            Tienes <strong>{summary.openBackordersCount}</strong> encargo(s) abierto(s).
          </p>
          <Link href="/cuenta/pedidos" className="mt-2 inline-block text-sm text-primary hover:underline">
            Ver pedidos
          </Link>
        </section>
      ) : null}

      {summary.debtSummary && summary.debtSummary.pendingCount > 0 ? (
        <section className="rounded-lg border border-border p-4">
          <p className="text-sm">
            Saldo pendiente: <strong>{fmt(summary.debtSummary.totalDue)}</strong> (
            {summary.debtSummary.pendingCount} cuota(s))
          </p>
          <Link href="/cuenta/deudas" className="mt-2 inline-block text-sm text-primary hover:underline">
            Ver deudas
          </Link>
        </section>
      ) : null}

      <section>
        <h3 className="mb-2 text-sm font-semibold">Pedidos recientes</h3>
        {summary.recentOrders.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no tienes pedidos.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {summary.recentOrders.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-2 px-4 py-3 text-sm">
                <div>
                  <Link href={`/cuenta/pedidos/${o.id}`} className="font-medium text-primary hover:underline">
                    {o.documentNumber}
                  </Link>
                  <p className="text-muted-foreground">{o.fulfillmentStatus}</p>
                </div>
                <span>{fmt(o.total)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
