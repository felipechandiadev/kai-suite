import { getCustomerSessionToken } from "@/lib/eshop-customer-session";
import { EShopCustomerAccountRequest } from "@/features/e-shop-customer-account/infrastructure/customer-account.request";

function fmt(n: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n);
}

export default async function CuentaDeudasPage() {
  const token = await getCustomerSessionToken();
  if (!token) return null;

  let debts = { quotas: [] as Array<Record<string, unknown>>, totalDue: 0, credit: null as null | { limit: number; used: number; available: number } };
  let error: string | null = null;
  try {
    debts = await EShopCustomerAccountRequest.getDebts(token);
  } catch (e) {
    error = e instanceof Error ? e.message : "No se pudieron cargar las deudas";
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Mis deudas</h2>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {debts.credit ? (
        <div className="rounded-lg border border-border p-4 text-sm">
          <p>
            Crédito disponible: <strong>{fmt(debts.credit.available)}</strong> de{" "}
            {fmt(debts.credit.limit)}
          </p>
        </div>
      ) : null}
      {debts.quotas.length === 0 && !error ? (
        <p className="text-sm text-muted-foreground">No tienes cuotas pendientes.</p>
      ) : null}
      {debts.quotas.length > 0 ? (
        <>
          <p className="text-sm">
            Total pendiente: <strong>{fmt(debts.totalDue)}</strong>
          </p>
          <ul className="divide-y divide-border rounded-lg border border-border text-sm">
            {debts.quotas.map((q) => {
              const pending = Math.max(0, Number(q.amount) - Number(q.amountPaid));
              return (
                <li key={String(q.id)} className="flex justify-between gap-2 px-4 py-3">
                  <div>
                    <p className="font-medium">{String(q.documentNumber ?? "Cuota")}</p>
                    <p className="text-muted-foreground">
                      Vence {q.dueDate ? new Date(String(q.dueDate)).toLocaleDateString("es-CL") : "—"}
                    </p>
                  </div>
                  <span>{fmt(pending)}</span>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
    </div>
  );
}
