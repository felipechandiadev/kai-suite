import Link from "next/link";
import { MercadoPagoPaymentStep } from "@/features/e-shop-checkout/ui/MercadoPagoPaymentStep";

export default async function CheckoutPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  const { orderId: raw } = await searchParams;
  const orderId = raw?.trim() ?? "";

  if (!orderId) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-12 text-center">
        <h1 className="text-2xl font-semibold">Pago</h1>
        <p className="text-sm text-muted-foreground">
          Falta el identificador del pedido. Vuelve al checkout para continuar.
        </p>
        <Link href="/checkout" className="text-sm text-primary hover:underline">
          Ir al checkout
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <MercadoPagoPaymentStep orderId={orderId} />
    </div>
  );
}
