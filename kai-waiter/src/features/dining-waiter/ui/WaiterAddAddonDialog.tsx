"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Dialog, DotProgress } from "@kai/ui";
import {
  addOrderLineAddonAction,
  listWaiterHostAddonsAction,
  lookupWaiterVariantsAction,
  resolveWaiterBranchCatalogContextAction,
} from "../actions/waiter.action";
import type { WaiterHostAddonOption } from "../infrastructure/dining.request";
import { messageFromUnknownError } from "../lib/waiter-account-unavailable";

function formatMoney(n: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

type OptionRow = WaiterHostAddonOption & { unitPrice: number };

type Props = {
  open: boolean;
  userId: string;
  companyId: string;
  branchId: string;
  orderId: string;
  lineId: string;
  hostProductId: string;
  variantId?: string;
  onClose: () => void;
  onAdded: () => void;
};

export function WaiterAddAddonDialog({
  open,
  userId,
  companyId,
  branchId,
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
      try {
        const auth = { userId, companyId };
        let productId = hostProductId.trim();
        const catalog = await resolveWaiterBranchCatalogContextAction({
          ...auth,
          branchId,
        });
        if (!productId && variantId?.trim()) {
          const looked = await lookupWaiterVariantsAction({
            ...auth,
            variantIds: [variantId.trim()],
            branchId,
            priceListId: catalog.priceListId,
            pointOfSaleId: catalog.pointOfSaleId,
          });
          productId = looked[variantId.trim()]?.productId?.trim() ?? "";
        }
        if (cancelled) return;
        const listed = await listWaiterHostAddonsAction({
          ...auth,
          hostProductId: productId,
        });
        if (cancelled) return;
        const variantIds = listed.map((o) => o.variantId);
        const prices =
          variantIds.length > 0
            ? await lookupWaiterVariantsAction({
                ...auth,
                variantIds,
                branchId,
                priceListId: catalog.priceListId,
                pointOfSaleId: catalog.pointOfSaleId,
              })
            : {};
        if (cancelled) return;
        setOptions(
          listed.map((o) => ({
            ...o,
            unitPrice: prices[o.variantId]?.unitPrice ?? 0,
          })),
        );
      } catch (e) {
        if (cancelled) return;
        setError(messageFromUnknownError(e, "No se pudieron cargar los extras"));
        setOptions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, hostProductId, variantId, userId, companyId, branchId]);

  const handlePick = (addonVariantId: string) => {
    setSubmitting(true);
    setError(null);
    void addOrderLineAddonAction({
      userId,
      companyId,
      orderId,
      lineId,
      addonVariantId,
      quantity: 1,
    })
      .then(() => {
        setSubmitting(false);
        onAdded();
        onClose();
      })
      .catch((e) => {
        setSubmitting(false);
        setError(messageFromUnknownError(e, "No se pudo agregar el extra"));
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
      data-test-id="waiter-add-addon-dialog"
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
              data-test-id={`waiter-add-addon-pick-${opt.variantId}`}
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
