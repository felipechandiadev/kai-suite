"use client";

import { useEffect, useRef, useState } from "react";
import { Alert, Button, Dialog, TextField } from "@kai/ui";
import { usePosCart } from "@/features/pos-cart/PosCartProvider";
import type { LoadedQuotationMeta } from "@/features/pos-cart/cart-storage";
import { findQuotationByDocumentPosAction } from "@/features/quotations/actions/quotations-pos.action";
import type { QuotationDetail } from "@/features/quotations/types/quotation.types";
import type { PosCartLine } from "@/app/(pos)/pos/ui/PosCartLineCard";
import { lookupPosVariantsAction } from "@/features/pos-products/actions/pos-products.action";
import { enrichQuotationLinesWithPosSnapshot } from "@/features/pos-quotations/lib/enrich-quotation-lines-from-pos";

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
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-CL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Precios desde el snapshot; stock y atributos se enriquecen con lookup POS al cargar. */
function quotationLinesToCart(detail: QuotationDetail): PosCartLine[] {
  return detail.lines.map((l) => {
    const displayName = l.variantName?.trim()
      ? `${l.productName} — ${l.variantName}`
      : l.productName;
    return {
      productId: l.productId ?? "",
      productName: displayName,
      productDescription: null,
      productImageUrl: null,
      variantId: l.productVariantId ?? l.id,
      sku: l.productSku ?? null,
      barcode: null,
      unitAllowDecimals: false,
      unitSymbol: null,
      unitId: null,
      unitPrice: Number(l.unitPrice) || 0,
      unitTaxRate: Number(l.taxRate) || 0,
      unitTaxAmount: Number(l.taxAmount) || 0,
      unitPriceWithTax:
        Number(l.quantity) > 0 ? Number(l.total) / Number(l.quantity) : Number(l.unitPrice) || 0,
      trackInventory: false,
      availableStock: null,
      availableStockBase: null,
      attributes: [],
      metadata: { fromQuotation: true },
      quantity: Number(l.quantity) || 1,
    };
  });
}

function buildQuotationMeta(
  preview: QuotationDetail,
  lines: PosCartLine[],
): LoadedQuotationMeta {
  const lineMaxQtyByVariantId: Record<string, number> = {};
  for (const l of lines) {
    lineMaxQtyByVariantId[l.variantId] = Math.max(
      1,
      Math.round(Number(l.quantity) || 1),
    );
  }
  return {
    id: preview.id,
    documentNumber: preview.documentNumber,
    validUntil: preview.validUntil ?? "",
    expired: preview.effectiveStatus === "EXPIRED",
    lineMaxQtyByVariantId,
  };
}

export function LoadQuotationDialog({ open, onClose, pointOfSaleId }: Props) {
  const cart = usePosCart();
  const folioFieldRef = useRef<HTMLDivElement>(null);
  const [folio, setFolio] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<QuotationDetail | null>(null);

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
      setError("Ingrese un folio (ej. COT-26-00001).");
      return;
    }
    setBusy(true);
    const res = await findQuotationByDocumentPosAction(folioTrim);
    setBusy(false);
    if (!res.success) {
      setError(res.message);
      return;
    }
    if (!res.quotation) {
      setError("No se encontró ninguna cotización con ese folio.");
      return;
    }
    setPreview(res.quotation);
  }

  async function handleLoad() {
    if (!preview) return;
    if (
      preview.effectiveStatus === "CONVERTED" ||
      preview.effectiveStatus === "CANCELLED"
    ) {
      setError(
        preview.effectiveStatus === "CONVERTED"
          ? "Esta cotización ya fue convertida en venta."
          : "Esta cotización fue anulada.",
      );
      return;
    }
    setBusy(true);
    setError(null);
    let lines = quotationLinesToCart(preview);
    const posId = pointOfSaleId?.trim();
    if (posId) {
      const variantIds = lines.map((l) => l.variantId).filter(Boolean);
      const lookup = await lookupPosVariantsAction({
        variantIds,
        pointOfSaleId: posId,
      });
      if (lookup.success) {
        lines = enrichQuotationLinesWithPosSnapshot(lines, lookup.products);
      }
    }
    const meta = buildQuotationMeta(preview, lines);
    const customer = preview.customerName
      ? {
          customerId: preview.customerId,
          name: preview.customerName,
          document: preview.customerDocument ?? "",
          phone: "",
        }
      : null;
    cart.loadQuotation(meta, lines, customer);
    setBusy(false);
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Cargar cotización en el POS"
      size="md"
      alertArea={error ? <Alert variant="error">{error}</Alert> : undefined}
      actions={
        <>
          <Button
            type="button"
            variant="outlined"
            onClick={onClose}
            disabled={busy}
          >
            Cancelar
          </Button>
          {preview ? (
            <Button
              type="button"
              variant="primary"
              onClick={handleLoad}
              loading={busy}
              disabled={busy}
              data-test-id="pos-load-quotation-confirm"
            >
              Cargar al carrito
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              onClick={handleSearch}
              loading={busy}
              disabled={busy}
              data-test-id="pos-load-quotation-search"
            >
              Buscar
            </Button>
          )}
        </>
      }
      actionsJustify="end"
      data-test-id="pos-load-quotation-dialog"
    >
      <div className="grid gap-3">
        <div ref={folioFieldRef}>
          <TextField
            label="Folio de cotización"
            placeholder="COT-26-00001"
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
            data-test-id="pos-load-quotation-folio"
          />
        </div>

        {preview ? (
          <div className="rounded-lg border border-border p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Folio</span>
              <span className="font-mono font-semibold">
                {preview.documentNumber}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estado</span>
              <span className="font-medium">{preview.effectiveStatus}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cliente</span>
              <span>{preview.customerName ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="font-medium">
                {formatMoney(Number(preview.total))}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Vence</span>
              <span>{formatDateTime(preview.validUntil)}</span>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Líneas: {preview.lines.length}
            </div>
            {preview.effectiveStatus === "EXPIRED" ? (
              <p className="mt-2 text-xs text-warning">
                La cotización está vencida. Al cargarla se respetan los
                precios cotizados; en la venta final se solicitará override.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </Dialog>
  );
}
