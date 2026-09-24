import { useEffect, useState } from "react";
import { Alert, Button, Select, TextField } from "@kai/ui";
import { liteFetch } from "@/lib/lite-client";
import { toUserMessage } from "@/lib/errors";
import type { LiteCatalogItem } from "@/lib/lite-api";
import { LitePage } from "@/shared/components/LitePage";

export function ReceiptsPage() {
  const [catalog, setCatalog] = useState<LiteCatalogItem[]>([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [supplier, setSupplier] = useState("");
  const [qty, setQty] = useState(10);
  const [variantId, setVariantId] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void liteFetch<{ items: LiteCatalogItem[] }>("/lite/catalog")
      .then((r) => {
        const items = r.items ?? [];
        setCatalog(items);
        if (items[0]) setVariantId(items[0].id);
      })
      .catch((e) => setCatalogError(toUserMessage(e)));
  }, []);

  async function receive() {
    setMsg(null);
    setError(null);
    if (!variantId) {
      setError("Selecciona una variante del catálogo.");
      return;
    }
    if (!supplier.trim()) {
      setError("Indica el nombre del proveedor.");
      return;
    }
    if (qty <= 0) {
      setError("Cantidad debe ser mayor a 0.");
      return;
    }
    setBusy(true);
    try {
      const res = await liteFetch<{ id: string }>("/lite/purchasing/receptions", {
        method: "POST",
        body: JSON.stringify({
          supplierName: supplier.trim(),
          lines: [{ variantId, qty }],
        }),
      });
      setMsg(`Recepción OK · id ${res.id} · stock +${qty}`);
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const variantOptions =
    catalog.length === 0
      ? [{ id: "", label: "Sin catálogo" }]
      : catalog.map((c) => ({
          id: c.id,
          label: `${c.name} · ${c.sku ?? c.id.slice(0, 8)} · ${c.type}`,
        }));

  return (
    <LitePage
      title="Recepciones"
      subtitle="Ingreso de compras → sube stock. Pagos proveedor solo por caja."
    >
      <div className="mt-4 flex max-w-md flex-col gap-3">
        {catalogError ? (
          <Alert variant="error">No se pudo cargar el catálogo: {catalogError}</Alert>
        ) : null}
        <TextField
          label="Proveedor"
          value={supplier}
          onChange={(e) => setSupplier(e.target.value)}
          placeholder="Nombre proveedor"
        />
        <Select
          label="Variante"
          options={variantOptions}
          value={variantId || null}
          onChange={(id) => setVariantId(id == null ? "" : String(id))}
          disabled={catalog.length === 0}
          alwaysShowLabel
        />
        <TextField
          label="Cantidad"
          type="number"
          value={String(qty)}
          onChange={(e) => setQty(Number(e.target.value) || 0)}
        />
        {msg ? <Alert variant="success">{msg}</Alert> : null}
        {error ? <Alert variant="error">{error}</Alert> : null}
        <div>
          <Button
            type="button"
            disabled={busy || !!catalogError}
            loading={busy}
            onClick={() => void receive()}
          >
            Registrar recepción
          </Button>
        </div>
      </div>
    </LitePage>
  );
}
