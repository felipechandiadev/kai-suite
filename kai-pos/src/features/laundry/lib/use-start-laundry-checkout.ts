"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { usePosCart } from "@/features/pos-cart/PosCartProvider";
import { lookupPosVariantsAction } from "@/features/pos-products/actions/pos-products.action";
import { readPosContextClient } from "@/features/session/lib/pos-context-storage";
import { redirectToLoginIfUnauthorized } from "@/lib/auth/pos-api-failure";
import type { LaundryReception } from "@/features/laundry/types/laundry.types";
import {
  type LaundryCheckoutCharge,
  laundryCartLinesTotal,
  laundryReceptionCustomer,
  laundryReceptionToCartLines,
  resolveLaundryChargeAmount,
  writeLaundryCheckoutDraft,
} from "@/features/laundry/lib/laundry-checkout";

/**
 * Carga el carrito POS con el cobro de la guía y navega a `/pos/payment`.
 */
export function useStartLaundryCheckout() {
  const router = useRouter();
  const cart = usePosCart();
  const [busy, setBusy] = useState(false);

  const startCheckout = useCallback(
    async (
      reception: LaundryReception,
      charge: LaundryCheckoutCharge,
    ): Promise<{ ok: true } | { ok: false; message: string }> => {
      const amount = resolveLaundryChargeAmount(reception, charge);
      if (amount <= 0) {
        return { ok: false, message: "No hay saldo pendiente por cobrar." };
      }

      const variantIds = [
        ...new Set(
          (reception.garments ?? [])
            .flatMap((g) => g.serviceLines ?? [])
            .map((l) => l.productVariantId)
            .filter(Boolean),
        ),
      ];
      if (variantIds.length === 0) {
        return { ok: false, message: "La guía no tiene servicios para cobrar." };
      }

      setBusy(true);
      try {
        const ctx = readPosContextClient();
        const lookupRes = await lookupPosVariantsAction({
          variantIds,
          pointOfSaleId: ctx?.pointOfSaleId ?? null,
          branchId: ctx?.branchId ?? reception.branchId,
          priceListId: ctx?.priceListId ?? null,
        });
        if (!lookupRes.success) {
          if (redirectToLoginIfUnauthorized(lookupRes)) {
            return { ok: false, message: "Sesión expirada." };
          }
          return { ok: false, message: lookupRes.message };
        }

        const cartLines = laundryReceptionToCartLines(
          reception,
          lookupRes.products,
          charge,
        );
        if (cartLines.length === 0) {
          return {
            ok: false,
            message: "No se pudieron resolver los servicios para el cobro.",
          };
        }

        if (cart.cartMode !== "sale") {
          cart.exitReturnMode();
          cart.exitFulfillBackorderMode();
        }
        cart.disableEncargoMode();
        cart.clearBackorderDeposit();
        cart.clearPosDelivery();
        cart.setPayments([]);
        cart.replaceLines(cartLines);
        cart.setSaleCustomer(laundryReceptionCustomer(reception));

        writeLaundryCheckoutDraft({
          receptionId: reception.id,
          code: reception.code?.trim() || reception.id.slice(0, 8),
          charge,
          expectedPaidTotal:
            charge === "full"
              ? laundryCartLinesTotal(cartLines)
              : amount,
        });

        const params = new URLSearchParams({
          laundryReceptionId: reception.id,
          laundryCharge: charge,
        });
        router.push(`/pos/payment?${params.toString()}`);
        return { ok: true };
      } finally {
        setBusy(false);
      }
    },
    [cart, router],
  );

  return { startCheckout, busy };
}
