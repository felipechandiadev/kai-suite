"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Alert, Button, TextField } from "@kai/ui";
import { handleUnauthorizedClient } from "@/lib/auth/handle-unauthorized";
import { createQuickProductAction } from "@/features/product/actions/product.action";
import { SCAN_PATH } from "@/features/variant/lib/variant-routes";
import type { ScanMode } from "@/features/variant/domain/scan-mode.entity";

export type CreateProductPageProps = {
  scannedCode: string;
  mode: ScanMode;
};

export default function CreateProductPage({ scannedCode, mode }: CreateProductPageProps) {
  const [productName, setProductName] = useState("");
  const [sku, setSku] = useState(mode === "sku" ? scannedCode : "");
  const [barcode, setBarcode] = useState(mode === "barcode" ? scannedCode : "");
  const [basePrice, setBasePrice] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const skuLocked = scannedCode.trim().length > 0 && mode === "sku";
  const barcodeLocked = scannedCode.trim().length > 0 && mode === "barcode";

  useEffect(() => {
    setProductName("");
    setSku(mode === "sku" ? scannedCode : "");
    setBarcode(mode === "barcode" ? scannedCode : "");
    setBasePrice("");
    setError("");
  }, [scannedCode, mode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedSku = sku.trim();
    const trimmedName = productName.trim();
    if (!trimmedName) {
      setError("El nombre es obligatorio");
      return;
    }
    if (!trimmedSku) {
      setError("El SKU es obligatorio");
      return;
    }
    setError("");
    startTransition(async () => {
      const r = await createQuickProductAction({
        productName: trimmedName,
        sku: trimmedSku,
        barcode: barcode.trim() || undefined,
        basePrice: basePrice.trim() ? Number(basePrice.replace(/\D/g, "")) : 0,
      });
      if (!r.success) {
        if (handleUnauthorizedClient(r)) {
          return;
        }
        setError(r.error);
      }
    });
  };

  return (
    <div className="flex flex-col gap-4 pb-8" data-test-id="create-product-page">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Crear producto</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {scannedCode.trim() ? (
            <>
              No existe una variante con el código <strong>{scannedCode}</strong>. Completa los datos
              mínimos para registrar el producto y su stock en el almacén por defecto.
            </>
          ) : (
            <>
              Completa los datos mínimos para registrar un producto nuevo y su stock en el almacén por
              defecto.
            </>
          )}
        </p>
      </div>
      {error ? <Alert variant="error">{error}</Alert> : null}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" id="create-product-form">
        <TextField
          label="Nombre del producto"
          placeholder="Nombre del producto"
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          disabled={pending}
          required
        />
        <TextField
          label="SKU"
          placeholder="SKU"
          value={sku}
          onChange={(e) => setSku(e.target.value)}
          disabled={pending || skuLocked}
          readOnly={skuLocked}
          required
        />
        <TextField
          label="Código de barras"
          placeholder="Código de barras (opcional)"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          disabled={pending || barcodeLocked}
          readOnly={barcodeLocked}
        />
        <TextField
          label="Precio de venta (con IVA)"
          type="currency"
          placeholder="Precio de venta con impuestos"
          value={basePrice}
          onChange={(e) => setBasePrice(e.target.value)}
          disabled={pending}
          helperText="Se guarda como precio con impuestos. El neto se calcula con el IVA por defecto de la empresa."
        />
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
          <Link
            href={SCAN_PATH}
            className="inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground no-underline hover:bg-muted/40"
          >
            Cancelar
          </Link>
          <Button type="submit" loading={pending} disabled={pending}>
            Crear
          </Button>
        </div>
      </form>
    </div>
  );
}
