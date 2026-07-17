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

export function ProductionOrderDetail({ batch: initial }: Props) {
  const router = useRouter();
  const [batch, setBatch] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canAct =
    batch.status === "DRAFT" || batch.status === "CONFIRMED";

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
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4" data-test-id="production-order-detail">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">
            {batch.documentNumber ?? "Orden de producción"}
          </h1>
          <div className="mt-1">{statusBadge(batch.status)}</div>
        </div>
        <Link href="/inventory/production/orders">
          <Button variant="outlined">Volver</Button>
        </Link>
      </div>

      <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Sucursal</dt>
          <dd>{batch.branchName ?? batch.branchId ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Almacén</dt>
          <dd>{batch.storageName ?? batch.storageId ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Producto</dt>
          <dd>{batch.outputProductName ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Cantidad</dt>
          <dd className="tabular-nums">{batch.outputQuantity ?? "—"}</dd>
        </div>
        {batch.unitCost != null ? (
          <div>
            <dt className="text-muted-foreground">Costo unitario</dt>
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
        <p className="mb-2 text-sm font-medium">Líneas</p>
        <ul className="space-y-1 text-sm">
          {batch.lines.map((l) => (
            <li key={l.id} className="flex justify-between gap-2">
              <span>{l.productName ?? l.productVariantId ?? "—"}</span>
              <span className="tabular-nums text-muted-foreground">{l.quantity}</span>
            </li>
          ))}
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
