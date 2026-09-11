"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Dialog, DotProgress } from "@kai/ui";
import {
  addPosDiningLineAddonAction,
  listPosDiningHostAddonsAction,
} from "@/features/dining/actions/dining-pos.action";
import type { PosDiningHostAddonOption } from "@/features/dining/infrastructure/dining-pos.request";
import { lookupPosVariantsAction } from "@/features/pos-products/actions/pos-products.action";
import { redirectToLoginIfUnauthorized } from "@/lib/auth/pos-api-failure";
import { readPosContextClient } from "@/features/session/lib/pos-context-storage";

function formatMoney(n: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

type OptionRow = PosDiningHostAddonOption & { unitPrice: number };

type Props = {
  open: boolean;
  orderId: string;
  lineId: string;
  hostProductId: string;
  variantId?: string;
  onClose: () => void;
  onAdded: () => void;
};

export function PosDiningAddAddonDialog({
  open,
  orderId,
  lineId,
  hostProductId,
  variantId,
  onClose,
  onAdded,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<OptionRow[]>([]);

  useEffect(() => {
    if (!open) {
      setOptions([]);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      let productId = hostProductId.trim();
      if (!productId && variantId?.trim()) {
        const ctx = readPosContextClient();
        const looked = await lookupPosVariantsAction({
          variantIds: [variantId.trim()],
          branchId: ctx?.branchId ?? null,
          pointOfSaleId: ctx?.pointOfSaleId ?? null,
          priceListId: ctx?.priceListId ?? null,
        });
        if (cancelled) return;
        if (looked.success) {
          productId = looked.products[0]?.productId?.trim() ?? "";
        }
      }
      const listed = await listPosDiningHostAddonsAction(productId);
      if (cancelled) return;
      if (!listed.success) {
        if (redirectToLoginIfUnauthorized(listed)) return;
        setError(listed.message);
        setOptions([]);
        setLoading(false);
        return;
      }
      const variantIds = listed.options.map((o) => o.variantId);
      const ctx = readPosContextClient();
      const prices =
        variantIds.length > 0
          ? await lookupPosVariantsAction({
              variantIds,
              branchId: ctx?.branchId ?? null,
              pointOfSaleId: ctx?.pointOfSaleId ?? null,
              priceListId: ctx?.priceListId ?? null,
            })
          : { success: true as const, products: [] };
      if (cancelled) return;
      const priceById = new Map(
        prices.success ? prices.products.map((p) => [p.variantId, Number(p.unitPriceWithTax) || 0]) : [],
      );
      setOptions(
        listed.options.map((o) => ({
          ...o,
          unitPrice: priceById.get(o.variantId) ?? 0,
        })),
      );
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, hostProductId, variantId]);

  const handlePick = (variantId: string) => {
    setSubmitting(true);
    setError(null);
    void addPosDiningLineAddonAction({
      orderId,
      lineId,
      addonVariantId: variantId,
      quantity: 1,
    }).then((res) => {
      setSubmitting(false);
      if (!res.success) {
        if (redirectToLoginIfUnauthorized(res)) return;
        setError(res.message);
        return;
      }
      onAdded();
      onClose();
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Agregar extra"
      size="sm"
      alertArea={error ? <Alert variant="error">{error}</Alert> : undefined}
      actions={
        <Button type="button" variant="outlined" onClick={onClose} disabled={submitting}>
          Cerrar
        </Button>
      }
      data-test-id="pos-dining-add-addon-dialog"
    >
      <div className="max-h-[min(16rem,40vh)] space-y-2 overflow-y-auto" aria-busy={loading}>
        {loading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <DotProgress />
            Cargando extras…
          </p>
        ) : options.length === 0 ? (
          <p className="text-sm text-muted-foreground">Este plato no tiene extras configurados.</p>
        ) : (
          options.map((opt) => (
            <button
              key={opt.variantId}
              type="button"
              disabled={submitting}
              onClick={() => handlePick(opt.variantId)}
              className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-left text-sm hover:bg-muted disabled:opacity-50"
              data-test-id={`pos-dining-add-addon-pick-${opt.variantId}`}
            >
              <span className="font-medium">{opt.name}</span>
              <span className="tabular-nums text-muted-foreground">{formatMoney(opt.unitPrice)}</span>
            </button>
          ))
        )}
      </div>
    </Dialog>
  );
}
