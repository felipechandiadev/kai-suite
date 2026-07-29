"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Button, DotProgress } from "@kai/ui";
import {
  getLaundryReceptionAction,
  listLaundryCatalogAction,
  updateLaundryReceptionStatusAction,
} from "@/features/laundry/actions/laundry.action";
import { laundryPaymentModeLabel } from "@/features/laundry/lib/laundry-payment-mode-label";
import { laundryReceptionStatusLabel } from "@/features/laundry/lib/laundry-reception-status-label";
import { printLaundryReceptionFromRecord } from "@/features/laundry/lib/laundry-reception-ticket-agent";
import { availableLaundryCharges } from "@/features/laundry/lib/laundry-checkout";
import { useStartLaundryCheckout } from "@/features/laundry/lib/use-start-laundry-checkout";
import type {
  LaundryCatalogBundle,
  LaundryReception,
  LaundryReceptionStatus,
} from "@/features/laundry/types/laundry.types";
import { formatMoney } from "@/features/pos-products/ui/posProductPreview";

type Props = {
  receptionId: string;
};

function formatDate(value: string | null | undefined): string {
  if (!value?.trim()) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const NEXT_STATUS_ACTIONS: Partial<
  Record<LaundryReceptionStatus, Array<{ status: LaundryReceptionStatus; label: string }>>
> = {
  RECEIVED: [{ status: "IN_PROCESS", label: "Marcar en proceso" }],
  IN_PROCESS: [{ status: "READY", label: "Marcar lista" }],
  READY: [{ status: "DELIVERED", label: "Marcar entregada" }],
};

export default function LaundryReceptionDetail({ receptionId }: Props) {
  const router = useRouter();
  const { startCheckout, busy: checkoutBusy } = useStartLaundryCheckout();
  const [reception, setReception] = useState<LaundryReception | null>(null);
  const [catalog, setCatalog] = useState<LaundryCatalogBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [printing, setPrinting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [detailRes, catalogRes] = await Promise.all([
      getLaundryReceptionAction(receptionId),
      listLaundryCatalogAction(),
    ]);
    setLoading(false);
    if (!detailRes.success) {
      setError(detailRes.message);
      setReception(null);
      return;
    }
    setReception(detailRes.reception);
    if (catalogRes.success) {
      setCatalog(catalogRes.catalog);
    }
  }, [receptionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const typeNameById = useMemo(
    () => new Map((catalog?.garmentTypes ?? []).map((t) => [t.id, t.name] as const)),
    [catalog?.garmentTypes],
  );

  const statusActions = reception ? NEXT_STATUS_ACTIONS[reception.status] ?? [] : [];
  const chargeActions = reception ? availableLaundryCharges(reception) : [];

  const onUpdateStatus = async (status: LaundryReceptionStatus) => {
    if (!reception) return;
    setBusy(true);
    setActionError(null);
    const res = await updateLaundryReceptionStatusAction(reception.id, status);
    setBusy(false);
    if (!res.success) {
      setActionError(res.message);
      return;
    }
    setReception(res.reception);
    router.refresh();
  };

  const onCharge = async (charge: (typeof chargeActions)[number]["charge"]) => {
    if (!reception) return;
    setActionError(null);
    const res = await startCheckout(reception, charge);
    if (!res.ok) {
      setActionError(res.message);
    }
  };

  const onReprint = async () => {
    if (!reception) return;
    setPrinting(true);
    setActionError(null);
    try {
      await printLaundryReceptionFromRecord(reception, catalog);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "No se pudo imprimir la guía.");
    } finally {
      setPrinting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[12rem] items-center justify-center" data-test-id="laundry-reception-detail-loading">
        <DotProgress />
      </div>
    );
  }

  if (error || !reception) {
    return (
      <Alert variant="error" data-test-id="laundry-reception-detail-error">
        {error ?? "Recepción no encontrada."}
      </Alert>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4" data-test-id="laundry-reception-detail">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/laundry/receptions"
            className="text-sm text-primary hover:underline"
            data-test-id="laundry-reception-back-link"
          >
            ← Volver al listado
          </Link>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
            Guía {reception.code?.trim() || reception.id.slice(0, 8)}
          </h1>
          <p className="text-sm text-muted-foreground">
            {laundryReceptionStatusLabel(reception.status)} · {reception.customerNameSnapshot}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {chargeActions.map((action) => (
            <Button
              key={action.charge}
              type="button"
              variant="primary"
              disabled={busy || checkoutBusy}
              onClick={() => void onCharge(action.charge)}
              data-test-id={`laundry-reception-charge-${action.charge}`}
            >
              {action.label} ({formatMoney(action.amount)})
            </Button>
          ))}
          {statusActions.map((action) => (
            <Button
              key={action.status}
              type="button"
              variant="outlined"
              disabled={busy || checkoutBusy}
              onClick={() => void onUpdateStatus(action.status)}
              data-test-id={`laundry-reception-status-${action.status.toLowerCase()}`}
            >
              {action.label}
            </Button>
          ))}
          <Button
            type="button"
            variant="outlined"
            disabled={printing}
            onClick={() => void onReprint()}
            data-test-id="laundry-reception-reprint"
          >
            {printing ? "Imprimiendo…" : "Reimprimir guía"}
          </Button>
        </div>
      </div>

      {actionError ? (
        <Alert variant="error" data-test-id="laundry-reception-action-error">
          {actionError}
        </Alert>
      ) : null}

      <div className="grid gap-3 rounded-xl border border-border bg-background p-4 sm:grid-cols-2">
        <div>
          <p className="text-xs text-muted-foreground">Cliente</p>
          <p className="font-medium">{reception.customerNameSnapshot}</p>
          {reception.customerPhoneSnapshot?.trim() ? (
            <p className="text-sm text-muted-foreground">{reception.customerPhoneSnapshot}</p>
          ) : null}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Modo de pago</p>
          <p className="font-medium">{laundryPaymentModeLabel(reception.paymentMode)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Recibida</p>
          <p className="font-medium">{formatDate(reception.receivedAt ?? reception.createdAt)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Prometida</p>
          <p className="font-medium">{formatDate(reception.promisedAt)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Total servicios</p>
          <p className="font-medium">{formatMoney(reception.servicesTotal)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Pagado</p>
          <p className="font-medium">{formatMoney(reception.paidAmount)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Saldo</p>
          <p className="font-medium">{formatMoney(reception.balanceDue)}</p>
        </div>
        {reception.paymentMode === "DEPOSIT_THEN_BALANCE" ? (
          <div>
            <p className="text-xs text-muted-foreground">Abono acordado</p>
            <p className="font-medium">{formatMoney(reception.depositAmount)}</p>
          </div>
        ) : null}
        {reception.notes?.trim() ? (
          <div className="sm:col-span-2">
            <p className="text-xs text-muted-foreground">Notas</p>
            <p className="font-medium">{reception.notes}</p>
          </div>
        ) : null}
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Prendas</h2>
        {(reception.garments ?? []).map((garment) => (
          <div
            key={garment.id}
            className="rounded-xl border border-border p-4"
            data-test-id={`laundry-reception-garment-${garment.id}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">
                {typeNameById.get(garment.garmentTypeId) ?? "Prenda"} × {garment.quantity}
              </p>
            </div>
            {garment.attributeValues.length > 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {garment.attributeValues.map((a) => a.label ?? a.valueId).join(" · ")}
              </p>
            ) : null}
            {garment.careInstructions?.trim() ? (
              <p className="mt-1 text-sm text-muted-foreground">{garment.careInstructions}</p>
            ) : null}
            {garment.customerNotes?.trim() ? (
              <p className="mt-1 text-sm italic text-muted-foreground">{garment.customerNotes}</p>
            ) : null}
            <ul className="mt-3 space-y-1 text-sm">
              {(garment.serviceLines ?? []).map((line) => (
                <li
                  key={line.id}
                  className="flex items-center justify-between gap-2"
                  data-test-id={`laundry-reception-service-${line.id}`}
                >
                  <span>
                    Servicio · {line.quantity} × {formatMoney(line.unitPrice)}
                  </span>
                  <span className="font-medium">{formatMoney(line.lineTotal)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
