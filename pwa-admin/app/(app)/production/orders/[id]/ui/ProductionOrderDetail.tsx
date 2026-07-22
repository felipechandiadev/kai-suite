"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, Button } from "@kai/ui";
import type { ProductionBatchDetail } from "@/features/inventory-production/types/production-batch.types";
import {
  cancelProductionBatchAction,
  completeProductionBatchAction,
} from "@/features/inventory-production/actions/production-batch.action";

type Props = {
  batch: ProductionBatchDetail;
};

function statusBadge(status: string) {
  const s = status.toUpperCase();
  if (s === "COMPLETED") return <Badge variant="success">Completada</Badge>;
  if (s === "CANCELLED") return <Badge variant="secondary">Cancelada</Badge>;
  if (s === "DRAFT") return <Badge variant="warning">Borrador</Badge>;
  return <Badge variant="info">{status || "—"}</Badge>;
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("es-CL", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function ProductionOrderDetail({ batch: initial }: Props) {
  const router = useRouter();
  const [batch, setBatch] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canAct = batch.status === "DRAFT" || batch.status === "CONFIRMED";
  const order = batch.productionOrder;
  const lots = order?.lots?.length
    ? order.lots
    : batch.lines.map((l, idx) => ({
        lineKey: l.id || `line-${idx}`,
        productVariantId: l.productVariantId ?? "",
        quantity: l.quantity,
        notes: l.notes ?? undefined,
        attributes: [] as Array<{
          attributeId: string;
          optionId: string;
          attributeName: string;
          optionLabel: string;
        }>,
      }));

  const onComplete = async () => {
    setBusy(true);
    setError(null);
    const r = await completeProductionBatchAction(batch.id);
    setBusy(false);
    if (!r.success) {
      setError(r.message);
      return;
    }
    router.refresh();
    setBatch((prev) => ({ ...prev, status: "COMPLETED" }));
  };

  const onCancel = async () => {
    setBusy(true);
    setError(null);
    const r = await cancelProductionBatchAction(batch.id);
    setBusy(false);
    if (!r.success) {
      setError(r.message);
      return;
    }
    setBatch(r.batch);
  };

  return (
    <div
      className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4"
      data-test-id="production-order-detail"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">
            {batch.documentNumber ?? "Orden de manufactura"}
          </h1>
          <div className="mt-1">{statusBadge(batch.status)}</div>
        </div>
        <Link href="/production/orders">
          <Button variant="outlined">Volver</Button>
        </Link>
      </div>

      <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Sucursal</dt>
          <dd>{batch.branchName ?? batch.branchId ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Unidad</dt>
          <dd>{order?.productionUnitId || batch.productionUnitId || "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Capacidad</dt>
          <dd className="tabular-nums">{order?.capacity ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Inicio planificado</dt>
          <dd>{formatDateTime(order?.plannedStartAt)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Entrega planificada</dt>
          <dd>{formatDateTime(order?.plannedDeliveryAt)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Almacén insumos</dt>
          <dd>{batch.storageName ?? batch.storageId ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Almacén salida</dt>
          <dd>{batch.outputStorageId ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Lotes</dt>
          <dd className="tabular-nums">{batch.lotCount || lots.length}</dd>
        </div>
        {batch.materialsCost != null ? (
          <div>
            <dt className="text-muted-foreground">Costo materiales</dt>
            <dd className="tabular-nums">{batch.materialsCost}</dd>
          </div>
        ) : null}
        {batch.laborCost != null ? (
          <div>
            <dt className="text-muted-foreground">Costo mano de obra</dt>
            <dd className="tabular-nums">{batch.laborCost}</dd>
          </div>
        ) : null}
        {batch.unitCost != null ? (
          <div>
            <dt className="text-muted-foreground">Costo unitario (prom.)</dt>
            <dd className="tabular-nums">{batch.unitCost}</dd>
          </div>
        ) : null}
        {batch.totalCost != null ? (
          <div>
            <dt className="text-muted-foreground">Costo total</dt>
            <dd className="tabular-nums">{batch.totalCost}</dd>
          </div>
        ) : null}
      </dl>

      {batch.notes ? (
        <p className="text-sm text-muted-foreground">Notas: {batch.notes}</p>
      ) : null}

      <div className="rounded-lg border border-border p-3">
        <p className="mb-3 text-sm font-medium">Lotes</p>
        <ul className="space-y-3">
          {lots.map((lot, idx) => {
            const line = batch.lines[idx];
            const title = line?.productName || lot.productVariantId || "—";
            return (
              <li
                key={lot.lineKey || idx}
                className="rounded-md border border-border/60 p-3 text-sm"
              >
                <div className="flex justify-between gap-2">
                  <span className="font-medium">{title}</span>
                  <span className="tabular-nums text-muted-foreground">
                    qty {lot.quantity}
                  </span>
                </div>
                {"attributes" in lot && lot.attributes?.length ? (
                  <ul className="mt-2 space-y-0.5 text-muted-foreground">
                    {lot.attributes.map((a) => (
                      <li key={`${a.attributeId}-${a.optionId}`}>
                        {a.attributeName}: {a.optionLabel}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {lot.notes ? (
                  <p className="mt-1 text-muted-foreground">Notas: {lot.notes}</p>
                ) : null}
                {"lineCost" in lot && lot.lineCost != null ? (
                  <p className="mt-1 tabular-nums text-muted-foreground">
                    Costo lote: {lot.lineCost}
                    {lot.unitCost != null ? ` (unit. ${lot.unitCost})` : ""}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {canAct ? (
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="outlined"
            disabled={busy}
            onClick={() => void onCancel()}
            data-test-id="production-cancel"
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            disabled={busy}
            onClick={() => void onComplete()}
            data-test-id="production-complete"
          >
            Completar producción
          </Button>
        </div>
      ) : null}
    </div>
  );
}
