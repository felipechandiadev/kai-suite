"use client";

import { CheckoutWizard } from "@/features/e-shop-checkout/ui/CheckoutWizard";

type CheckoutFormProps = {
  customerPortalEnabled?: boolean;
  requireRut?: boolean;
};

export function CheckoutForm(props: CheckoutFormProps) {
  return <CheckoutWizard {...props} />;
}
