"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { usePosCart } from "@/features/pos-cart/PosCartProvider";
import { lookupPosVariantsAction } from "@/features/pos-products/actions/pos-products.action";
import { readPosContextClient } from "@/features/session/lib/pos-context-storage";
import { redirectToLoginIfUnauthorized } from "@/lib/auth/pos-api-failure";
import {
  type LaundryPendingCheckout,
  laundryPendingToCartLines,
  writeLaundryPendingCheckout,
} from "@/features/laundry/lib/laundry-pending-checkout";
import { laundryCartLinesTotal } from "@/features/laundry/lib/laundry-checkout";

/**
 * Prepara carrito + pending draft y navega a `/pos/payment` (guía aún no creada).
 * Mapeo charge: FULL_ON_RECEIVE→full, DEPOSIT_THEN_BALANCE→deposit, FULL_ON_PICKUP→none.
 * Solo full/deposit llevan líneas de carrito (panel de pagos); none confirma sin cobro.
 */
export function useStartLaundryPendingCheckout() {
  const router = useRouter();
  const cart = usePosCart();
  const [busy, setBusy] = useState(false);

  const startPendingCheckout = useCallback(
    async (
      pending: LaundryPendingCheckout,
    ): Promise<{ ok: true } | { ok: false; message: string }> => {
      if (pending.garments.length === 0) {
        return { ok: false, message: "Agregá al menos una prenda." };
      }
      if (pending.charge === "deposit" && pending.expectedPaidTotal <= 0) {
        return { ok: false, message: "Indicá el monto del abono." };
      }

      setBusy(true);
      try {
        if (cart.cartMode !== "sale") {
          cart.exitReturnMode();
          cart.exitFulfillBackorderMode();
        }
        cart.disableEncargoMode();
        cart.clearBackorderDeposit();
        cart.clearPosDelivery();
        cart.setPayments([]);
        cart.setSaleCustomer(null);

        if (pending.charge === "none") {
          cart.replaceLines([]);
          writeLaundryPendingCheckout(pending);
          const params = new URLSearchParams({
            laundryPending: "1",
            laundryCharge: "none",
          });
          router.push(`/pos/payment?${params.toString()}`);
          return { ok: true };
        }

        const variantIds = [
          ...new Set(
            pending.garments
              .flatMap((g) => g.serviceLines)
              .map((l) => l.productVariantId)
              .filter(Boolean),
          ),
        ];
        if (variantIds.length === 0) {
          return { ok: false, message: "La guía no tiene servicios para cobrar." };
        }

        const ctx = readPosContextClient();
        const lookupRes = await lookupPosVariantsAction({
          variantIds,
          pointOfSaleId: ctx?.pointOfSaleId ?? null,
          branchId: ctx?.branchId ?? pending.branchId,
          priceListId: ctx?.priceListId ?? null,
        });
        if (!lookupRes.success) {
          if (redirectToLoginIfUnauthorized(lookupRes)) {
            return { ok: false, message: "Sesión expirada." };
          }
          return { ok: false, message: lookupRes.message };
        }

        const cartLines = laundryPendingToCartLines(pending, lookupRes.products);
        if (cartLines.length === 0) {
          return {
            ok: false,
            message: "No se pudieron resolver los servicios para el cobro.",
          };
        }

        const expected =
          pending.charge === "full"
            ? laundryCartLinesTotal(cartLines)
            : pending.expectedPaidTotal;

        writeLaundryPendingCheckout({
          ...pending,
          expectedPaidTotal: expected,
        });
        cart.replaceLines(cartLines);

        const params = new URLSearchParams({
          laundryPending: "1",
          laundryCharge: pending.charge,
        });
        router.push(`/pos/payment?${params.toString()}`);
        return { ok: true };
      } finally {
        setBusy(false);
      }
    },
    [cart, router],
  );

  return { startPendingCheckout, busy };
}
