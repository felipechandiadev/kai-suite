"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, ButtonPill, Dialog, DotProgress, Select } from "@kai/ui";
import {
  createPurchaseOrderFromSuggestionsAction,
  type SupplierOption,
} from "@/features/purchasing-suggestions/actions/purchase-suggestions.action";
import type {
  PurchaseSuggestionGroup,
  PurchaseSuggestionItem,
} from "@/features/purchasing-suggestions/types/purchase-suggestions.types";

type Props = {
  groups: PurchaseSuggestionGroup[];
  suppliers: SupplierOption[];
};

const clp = (n: number) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(
    Number.isFinite(n) ? n : 0,
  );
const num = (n: number) => new Intl.NumberFormat("es-CL", { maximumFractionDigits: 2 }).format(n);

function attrText(item: PurchaseSuggestionItem): string {
  const v = item.attributeValues ? Object.values(item.attributeValues).filter(Boolean) : [];
  return v.join(" · ");
}

export default function PurchaseSuggestionsBoard({ groups, suppliers }: Props) {
  if (groups.length === 0) {
    return (
      <div className="p-4" data-test-id="purchase-suggestions-empty">
        <Alert variant="info">
          No hay productos por reponer. Aparecen aquí los que están bajo el stock mínimo o en el punto de
          reposición (configurados en cada variante) y que no tienen suficiente pendiente en órdenes de compra.
        </Alert>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4 p-3" data-test-id="purchase-suggestions-board">
      {groups.map((g) => (
        <SupplierGroupCard key={g.supplierId ?? "none"} group={g} suppliers={suppliers} />
      ))}
    </div>
  );
}

function SupplierGroupCard({ group, suppliers }: { group: PurchaseSuggestionGroup; suppliers: SupplierOption[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(group.items.map((i) => [i.productVariantId, true])),
  );
  const [qty, setQty] = useState<Record<string, number>>(() =>
    Object.fromEntries(group.items.map((i) => [i.productVariantId, i.suggestedQuantity])),
  );
  const [supplierId, setSupplierId] = useState<string | null>(group.supplierId);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);

  const chosen = useMemo(
    () => group.items.filter((i) => selected[i.productVariantId] && (qty[i.productVariantId] ?? 0) > 0),
    [group.items, selected, qty],
  );
  const total = chosen.reduce((s, i) => s + (qty[i.productVariantId] ?? 0) * i.estimatedUnitCost, 0);
  const supplierLabel =
    group.supplierId != null
      ? group.supplierName
      : (suppliers.find((s) => s.id === supplierId)?.label ?? "Sin proveedor");
  const canCreate = chosen.length > 0 && Boolean(supplierId);

  const submit = async () => {
    if (!supplierId) return;
    setSubmitting(true);
    setError(null);
    const res = await createPurchaseOrderFromSuggestionsAction({
      supplierId,
      lines: chosen.map((i) => ({
        productId: i.productId,
        productVariantId: i.productVariantId,
        productName: i.productName,
        sku: i.sku,
        quantity: qty[i.productVariantId] ?? 0,
        unitPrice: i.estimatedUnitCost,
        taxIds: i.defaultTaxIds,
      })),
    });
    setSubmitting(false);
    if (res.success) {
      setConfirmOpen(false);
      setCreated(res.documentNumber ?? res.id);
      router.refresh();
    } else {
      setError(res.error);
    }
  };

  return (
    <section
      className="rounded-xl border border-border bg-surface"
      data-test-id={`purchase-suggestions-group-${group.supplierId ?? "none"}`}
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h2 className="m-0 text-base font-semibold">{group.supplierName}</h2>
          <p className="m-0 text-sm text-muted-foreground">
            {group.items.length} producto{group.items.length === 1 ? "" : "s"} por reponer · estimado neto{" "}
            {clp(group.estimatedNetTotal)}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          {group.supplierId == null ? (
            <div className="min-w-56">
              <Select
                label="Proveedor"
                name={`supplier-${group.supplierId ?? "none"}`}
                placeholder="Elegir proveedor"
                options={suppliers}
                value={supplierId}
                onChange={(id) => setSupplierId(id == null ? null : String(id))}
              />
            </div>
          ) : null}
          <ButtonPill
            variant="primary"
            disabled={!canCreate}
            onClick={() => setConfirmOpen(true)}
            data-test-id="purchase-suggestions-create-order"
          >
            Crear orden de compra
          </ButtonPill>
        </div>
      </header>

      {created ? (
        <div className="px-4 pt-3">
          <Alert variant="success">Orden de compra {created} creada.</Alert>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[56rem] text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="w-10 px-4 py-2" />
              <th className="px-2 py-2">Producto</th>
              <th className="px-2 py-2 text-right">Stock</th>
              <th className="px-2 py-2 text-right">En órdenes</th>
              <th className="px-2 py-2 text-right">Mínimo</th>
              <th className="px-2 py-2 text-right">Meta</th>
              <th className="w-28 px-2 py-2 text-right">Cantidad</th>
              <th className="px-2 py-2 text-right">Costo unit.</th>
              <th className="px-4 py-2 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {group.items.map((i) => {
              const q = qty[i.productVariantId] ?? 0;
              return (
                <tr key={i.productVariantId} className="border-t border-border">
                  <td className="px-4 py-2">
                    <input
                      type="checkbox"
                      aria-label={`Incluir ${i.productName}`}
                      checked={Boolean(selected[i.productVariantId])}
                      onChange={(e) => setSelected((s) => ({ ...s, [i.productVariantId]: e.target.checked }))}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <div className="font-medium">{i.productName}</div>
                    <div className="text-xs text-muted-foreground">
                      {i.sku}
                      {attrText(i) ? ` · ${attrText(i)}` : ""}
                      {i.reason === "BELOW_MINIMUM" ? (
                        <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-red-700">Bajo mínimo</span>
                      ) : (
                        <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-amber-700">Reposición</span>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-2 text-right">{num(i.currentStock)}</td>
                  <td className="px-2 py-2 text-right">{i.onOrder > 0 ? num(i.onOrder) : "—"}</td>
                  <td className="px-2 py-2 text-right">{i.minimumStock != null ? num(i.minimumStock) : "—"}</td>
                  <td className="px-2 py-2 text-right">{num(i.targetStock)}</td>
                  <td className="px-2 py-2 text-right">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={q}
                      aria-label={`Cantidad de ${i.productName}`}
                      className="w-24 rounded border border-border bg-background px-2 py-1 text-right"
                      onChange={(e) =>
                        setQty((s) => ({
                          ...s,
                          [i.productVariantId]: Math.max(0, Math.floor(Number(e.target.value) || 0)),
                        }))
                      }
                    />
                  </td>
                  <td className="px-2 py-2 text-right">
                    {clp(i.estimatedUnitCost)}
                    {i.lastUnitCost == null ? (
                      <div className="text-xs text-muted-foreground">sin compras previas</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-2 text-right">{clp(q * i.estimatedUnitCost)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog
        open={confirmOpen}
        onClose={() => (submitting ? undefined : setConfirmOpen(false))}
        title="Crear orden de compra"
        size="custom"
        maxWidth="30rem"
        scroll="body"
        actionsJustify="between"
        showCloseButton={false}
        data-test-id="purchase-suggestions-confirm-dialog"
        alertArea={error ? <Alert variant="error">{error}</Alert> : null}
        actions={
          <>
            <Button type="button" variant="outlined" size="md" disabled={submitting} onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
            <ButtonPill type="button" variant="primary" disabled={submitting} onClick={submit}>
              {submitting ? <DotProgress size={12} /> : "Crear orden"}
            </ButtonPill>
          </>
        }
      >
        <p className="m-0 text-base leading-relaxed">
          Se creará una orden de compra para <strong>{supplierLabel}</strong> con {chosen.length} línea
          {chosen.length === 1 ? "" : "s"} por un neto estimado de <strong>{clp(total)}</strong>. Los costos son el
          último valor comprado (o el PMP/costo base si no hay compras) y se pueden ajustar al recibir.
        </p>
      </Dialog>
    </section>
  );
}
