import Link from "next/link";

export default async function CheckoutPendingPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  const { orderId: raw } = await searchParams;
  const orderId = raw?.trim();

  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">Pago pendiente</h1>
      <p className="text-muted-foreground">
        Tu pago está en proceso de confirmación. Te avisaremos por email cuando se acredite.
      </p>
      {orderId ? (
        <p className="text-xs text-muted-foreground">Referencia: {orderId}</p>
      ) : null}
      {orderId ? (
        <Link
          href={`/checkout/payment?orderId=${encodeURIComponent(orderId)}`}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Volver al pago
        </Link>
      ) : (
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Volver a la tienda
        </Link>
      )}
    </div>
  );
}
