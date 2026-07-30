export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Credit payment</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Placeholder. Cobro de cuotas: `GET /customers/:id/pending-quotas` + `POST /payments/pay-quota`.
      </p>
    </div>
  );
}

