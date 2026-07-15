import Link from "next/link";

export default async function CheckoutFailurePage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  const { orderId: raw } = await searchParams;
  const orderId = raw?.trim();

  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">Pago no completado</h1>
      <p className="text-muted-foreground">
        El pago con Mercado Pago no se realizó o fue rechazado. Puedes intentar de nuevo.
      </p>
      {orderId ? (
        <Link
          href={`/checkout/payment?orderId=${encodeURIComponent(orderId)}`}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Reintentar pago
        </Link>
      ) : (
        <Link
          href="/checkout"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Volver al checkout
        </Link>
      )}
    </div>
  );
}
