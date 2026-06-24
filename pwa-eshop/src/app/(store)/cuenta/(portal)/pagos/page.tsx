import { getCustomerSessionToken } from "@/lib/eshop-customer-session";
import { EShopCustomerAccountRequest } from "@/features/e-shop-customer-account/infrastructure/customer-account.request";

function fmt(n: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n);
}

export default async function CuentaPagosPage() {
  const token = await getCustomerSessionToken();
  if (!token) return null;

  let payments: unknown[] = [];
  let error: string | null = null;
  try {
    const result = await EShopCustomerAccountRequest.getPayments(token);
    payments = result.payments;
  } catch (e) {
    error = e instanceof Error ? e.message : "No se pudieron cargar los pagos";
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Mis pagos</h2>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {!error && payments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay pagos registrados.</p>
      ) : null}
      {!error && payments.length > 0 ? (
        <ul className="divide-y divide-border rounded-lg border border-border text-sm">
          {payments.map((p, i) => {
            const row = p as Record<string, unknown>;
            const amount = Number(row.amount ?? row.total ?? 0);
            const doc = String(row.documentNumber ?? row.id ?? i);
            const date = row.createdAt ? new Date(String(row.createdAt)).toLocaleDateString("es-CL") : "—";
            return (
              <li key={doc} className="flex justify-between gap-2 px-4 py-3">
                <span>{doc}</span>
                <span>
                  {fmt(amount)} · {date}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
