export type CheckoutStepId = "cart" | "contact" | "delivery" | "review" | "payment";

export type CheckoutStepItem = {
  id: CheckoutStepId;
  title: string;
  description?: string;
};

export function buildCheckoutSteps(options: {
  includeCartStep?: boolean;
  includePaymentStep?: boolean;
}): CheckoutStepItem[] {
  const steps: CheckoutStepItem[] = [];
  if (options.includeCartStep) {
    steps.push({ id: "cart", title: "Carrito", description: "Revisa productos y avisos" });
  }
  steps.push(
    { id: "contact", title: "Contacto", description: "Datos para coordinar tu pedido" },
    { id: "delivery", title: "Entrega", description: "Método y dirección" },
    { id: "review", title: "Resumen", description: "Confirma totales y pago" },
  );
  if (options.includePaymentStep) {
    steps.push({ id: "payment", title: "Pago", description: "Mercado Pago" });
  }
  return steps;
}

export function isDeliveryAdvancedEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ESHOP_DELIVERY_ADVANCED === "true";
}
