"use client";

import { useEffect, useRef, useState } from "react";
import { Alert, Button, Dialog, TextField } from "@/shared/admin-shared";
import { usePosCart } from "@/features/pos-cart/PosCartProvider";
import { findSaleForReturnPosAction } from "@/features/pos-returns/actions/find-sale-for-return.action";
import type { PosSaleForReturn } from "@/features/pos-returns/types/pos-sale-for-return.types";
import { saleLinesToCart } from "@/features/pos-returns/lib/sale-lines-to-cart";

type Props = {
  open: boolean;
  onClose: () => void;
};

function formatMoney(n: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-CL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function LoadReturnSaleDialog({ open, onClose }: Props) {
  const cart = usePosCart();
  const folioFieldRef = useRef<HTMLDivElement>(null);
  const [folio, setFolio] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PosSaleForReturn | null>(null);

  useEffect(() => {
    if (!open) {
      setFolio("");
      setError(null);
      setPreview(null);
      setBusy(false);
      return;
    }
    const t = window.setTimeout(() => {
      folioFieldRef.current?.querySelector<HTMLInputElement>("input")?.focus({
        preventScroll: true,
      });
    }, 80);
    return () => clearTimeout(t);
  }, [open]);

  async function handleSearch() {
    setError(null);
    setPreview(null);
    const folioTrim = folio.trim();
    if (!folioTrim) {
      setError("Ingrese el folio interno de la venta.");
      return;
    }
    setBusy(true);
    const res = await findSaleForReturnPosAction(folioTrim);
    setBusy(false);
    if (!res.success) {
      setError(res.message);
      return;
    }
    if (!res.sale) {
      setError("No se encontró ninguna venta con ese folio.");
      return;
    }
    if (!res.sale.lines?.length) {
      setError("La venta no tiene líneas para devolver.");
      return;
    }
    const returnableTotal = Object.values(
      res.sale.lineMaxReturnableQtyByVariantId ?? {},
    ).reduce((a, n) => a + (Number(n) || 0), 0);
    if (returnableTotal < 0.0001) {
      setError(
        "Esta venta ya fue devuelta por completo; no queda cantidad por devolver.",
      );
      return;
    }
    setPreview(res.sale);
  }

  function handleLoad() {
    if (!preview) return;
    const lines = saleLinesToCart(preview);
    if (lines.length === 0) {
      setError(
        "No hay cantidad pendiente por devolver en esta venta (puede estar totalmente devuelta).",
      );
      return;
    }
    cart.loadReturnFromSale(preview, lines);
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Cargar venta para devolución"
      size="md"
      alertArea={error ? <Alert variant="error">{error}</Alert> : undefined}
      actions={
        <>
          <Button type="button" variant="outlined" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          {preview ? (
            <Button
              type="button"
              variant="primary"
              onClick={handleLoad}
              data-test-id="pos-load-return-confirm"
            >
              Cargar al carrito
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              onClick={() => void handleSearch()}
              loading={busy}
              disabled={busy}
              data-test-id="pos-load-return-search"
            >
              Buscar
            </Button>
          )}
        </>
      }
      actionsJustify="end"
      data-test-id="pos-load-return-dialog"
    >
      <div className="grid gap-3">
        <div ref={folioFieldRef}>
          <TextField
            label="Folio interno de la venta"
            placeholder="Ej. VTA-26-00042"
            value={folio}
            onChange={(e) =>
              setFolio((e as React.ChangeEvent<HTMLInputElement>).target.value)
            }
            onKeyDown={(e) => {
              if (e.key === "Enter" && !busy && !preview) {
                e.preventDefault();
                void handleSearch();
              }
            }}
            data-test-id="pos-load-return-folio"
          />
        </div>
        {preview ? (
          <div className="rounded-lg border border-border p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Folio</span>
              <span className="font-mono font-semibold">{preview.documentNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estado</span>
              <span className="font-medium">{preview.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cliente</span>
              <span>{preview.customerName ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total venta</span>
              <span className="font-medium">{formatMoney(Number(preview.total))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fecha</span>
              <span>{formatDateTime(preview.createdAt)}</span>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Líneas: {preview.lines.length}
            </div>
          </div>
        ) : null}
      </div>
    </Dialog>
  );
}
