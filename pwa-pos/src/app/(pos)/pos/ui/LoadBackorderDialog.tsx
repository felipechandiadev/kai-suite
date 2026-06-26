"use client";

import { useEffect, useRef, useState } from "react";
import { Alert, Button, Dialog, TextField } from "@/shared/admin-shared";
import { usePosCart } from "@/features/pos-cart/PosCartProvider";
import { findBackorderForFulfillPosAction } from "@/features/pos-backorders/actions/find-backorder-for-fulfill.action";
import { backorderLinesToCart } from "@/features/pos-backorders/lib/backorder-lines-to-cart";
import type { PosBackorderForFulfill } from "@/features/pos-backorders/types/pos-backorder-for-fulfill.types";

type Props = {
  open: boolean;
  onClose: () => void;
  pointOfSaleId?: string | null;
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

export function LoadBackorderDialog({ open, onClose, pointOfSaleId }: Props) {
  const cart = usePosCart();
  const folioFieldRef = useRef<HTMLDivElement>(null);
  const [folio, setFolio] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PosBackorderForFulfill | null>(null);

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
      setError("Ingrese el folio interno del encargo.");
      return;
    }
    setBusy(true);
    const res = await findBackorderForFulfillPosAction(folioTrim, pointOfSaleId);
    setBusy(false);
    if (!res.success) {
      setError(res.message);
      return;
    }
    if (!res.backorder) {
      setError("No se encontró ningún encargo con ese folio.");
      return;
    }
    if (res.backorder.reservationStatus !== "OPEN") {
      setError("El encargo no está abierto o ya fue liquidado.");
      return;
    }
    if (!res.backorder.lines?.length) {
      setError("El encargo no tiene líneas para liquidar.");
      return;
    }
    setPreview(res.backorder);
  }

  function handleLoad() {
    if (!preview) return;
    const lines = backorderLinesToCart(preview);
    if (lines.length === 0) {
      setError("No hay líneas con cantidad válida para liquidar.");
      return;
    }
    cart.loadBackorderForFulfill(preview, lines);
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Cargar encargo para liquidar"
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
              data-test-id="pos-load-backorder-confirm"
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
              data-test-id="pos-load-backorder-search"
            >
              Buscar
            </Button>
          )}
        </>
      }
      actionsJustify="end"
      data-test-id="pos-load-backorder-dialog"
    >
      <div className="grid gap-3">
        <div ref={folioFieldRef}>
          <TextField
            label="Folio interno del encargo"
            placeholder="Ej. ENC-26-00012"
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
            data-test-id="pos-load-backorder-folio"
          />
        </div>
        {preview ? (
          <div className="rounded-lg border border-border p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Folio</span>
              <span className="font-mono font-semibold">{preview.documentNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estado encargo</span>
              <span className="font-medium">{preview.reservationStatus}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cliente</span>
              <span>{preview.customerName ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total encargo</span>
              <span className="font-medium">{formatMoney(Number(preview.total))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Abono disponible</span>
              <span className="font-medium text-primary">
                {formatMoney(Number(preview.depositAvailable))}
              </span>
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
