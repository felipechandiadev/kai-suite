"use client";
import { LoadingState } from '@kai/ui';

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Dialog } from "@kai/ui";
import { Alert } from "@kai/ui";
import { Button } from "@kai/ui";
import type { StockGridRow, StockStorageBreakdownRow } from "@/features/inventory-stock/types/stock-grid.types";

function apiBase(): string {
  const base =
    process.env.NEXT_PUBLIC_BACKEND_API_URL?.trim() || process.env.BACKEND_API_URL?.trim() || "";
  if (!base) {
    throw new Error("BACKEND_API_URL no está definida");
  }
  return base.replace(/\/$/, "");
}

function fmtDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function StockReservationsDialog({
  open,
  onClose,
  row,
  storage,
}: {
  open: boolean;
  onClose: () => void;
  row: StockGridRow | null;
  storage: StockStorageBreakdownRow | null;
}) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<
    Array<{
      id: string;
      quantity: number;
      customerName: string;
      orderReference?: string;
      createdAt: string;
      expiresAt?: string;
      isExpired: boolean;
    }>
  >([]);

  const title = useMemo(() => {
    const base = row ? `${row.productName} · ${row.sku}` : "Reservas";
    const storageLabel = storage ? [storage.storageName, storage.branchName].filter(Boolean).join(" · ") : "";
    return storageLabel ? `${base} — ${storageLabel}` : base;
  }, [row, storage]);

  const load = useCallback(async () => {
    if (!row?.variantId || !storage?.storageId) return;
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams();
      q.set("variantId", row.variantId);
      q.set("storageId", storage.storageId);

      const token = (session?.user as any)?.accessToken as string | undefined;
      const activeCompanyId = (session?.user as any)?.activeCompanyId as string | undefined;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      if (activeCompanyId) headers["X-Active-Company-Id"] = activeCompanyId;

      const resHttp = await fetch(`${apiBase()}/api/inventory-transactions/reservations?${q.toString()}`, {
        method: "GET",
        headers,
        credentials: "include",
        cache: "no-store",
      });
      const json = (await resHttp.json().catch(() => null)) as any;
      if (!resHttp.ok) {
        const msg =
          typeof json?.message === "string" && json.message.trim()
            ? json.message.trim()
            : `Error ${resHttp.status} al cargar reservas`;
        throw new Error(msg);
      }
      const res = Array.isArray(json) ? json : [];
      setItems(
        res.map((r) => ({
          id: r.id,
          quantity: r.quantity,
          customerName: r.customerName,
          orderReference: r.orderReference,
          createdAt: r.createdAt,
          expiresAt: r.expiresAt,
          isExpired: r.isExpired,
        })),
      );
    } catch (e) {
      setItems([]);
      setError(e instanceof Error ? e.message : "No se pudieron cargar las reservas");
    } finally {
      setLoading(false);
    }
  }, [row?.variantId, storage?.storageId, session?.user]);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Detalle de reservas"
      size="lg"
      scroll="paper"
      alertArea={
        error ? (
          <Alert variant="error" data-test-id="stock-reservations-error">
            {error}
          </Alert>
        ) : null
      }
      actions={
        <>
          <span className="min-w-0 truncate text-xs text-muted-foreground" title={title}>
            {title}
          </span>
          <Button variant="secondary" type="button" onClick={onClose}>
            Cerrar
          </Button>
        </>
      }
      data-test-id="stock-reservations-dialog"
    >
      {loading ? <LoadingState className="flex items-center justify-center py-4" /> : null}

      {!loading && items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay reservas activas para esta variante en este almacén.</p>
      ) : null}

      {!loading && items.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[40rem] text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-muted-foreground">
                <th className="px-2 py-2 font-medium">Fecha</th>
                <th className="px-2 py-2 font-medium">Cliente</th>
                <th className="px-2 py-2 font-medium">Referencia</th>
                <th className="px-2 py-2 text-right font-medium">Cantidad</th>
                <th className="px-2 py-2 font-medium">Vence</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-b border-border/60 last:border-0">
                  <td className="whitespace-nowrap px-2 py-2 tabular-nums text-foreground">{fmtDateTime(it.createdAt)}</td>
                  <td className="max-w-[14rem] truncate px-2 py-2" title={it.customerName || undefined}>
                    {it.customerName || "—"}
                  </td>
                  <td
                    className="max-w-[14rem] truncate px-2 py-2 font-mono text-[11px] text-muted-foreground"
                    title={it.orderReference || undefined}
                  >
                    {it.orderReference || "—"}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-right font-mono tabular-nums text-foreground">
                    {new Intl.NumberFormat("es-CL", { maximumFractionDigits: 3 }).format(it.quantity)}
                  </td>
                  <td
                    className={`whitespace-nowrap px-2 py-2 tabular-nums ${it.isExpired ? "text-destructive" : "text-muted-foreground"}`}
                  >
                    {it.expiresAt ? fmtDateTime(it.expiresAt) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </Dialog>
  );
}
