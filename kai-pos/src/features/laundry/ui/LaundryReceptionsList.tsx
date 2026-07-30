"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Button, DotProgress, Select, TextField } from "@kai/ui";
import { listLaundryReceptionsAction } from "@/features/laundry/actions/laundry.action";
import {
  LAUNDRY_RECEPTION_STATUS_OPTIONS,
  laundryReceptionStatusLabel,
} from "@/features/laundry/lib/laundry-reception-status-label";
import { laundryPaymentModeLabel } from "@/features/laundry/lib/laundry-payment-mode-label";
import type {
  LaundryReception,
  LaundryReceptionStatus,
} from "@/features/laundry/types/laundry.types";
import PosBarcodeScanner from "@/features/pos-products/ui/PosBarcodeScanner";
import { formatMoney } from "@/features/pos-products/ui/posProductPreview";

type Props = {
  branchId: string;
};

type QueuePreset = "" | "READY" | "IN_PROCESS" | "RECEIVED";

const SCAN_COOLDOWN_MS = 800;

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

function normalizeCodeQuery(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

export default function LaundryReceptionsList({ branchId }: Props) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<LaundryReceptionStatus | "">("");
  const [queuePreset, setQueuePreset] = useState<QueuePreset>("");
  const [codeQuery, setCodeQuery] = useState("");
  const [debouncedCode, setDebouncedCode] = useState("");
  const [items, setItems] = useState<LaundryReception[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanHint, setScanHint] = useState<string | null>(null);
  const [lookupBusy, setLookupBusy] = useState(false);
  const lastScanAtRef = useRef(0);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedCode(normalizeCodeQuery(codeQuery)), 300);
    return () => window.clearTimeout(t);
  }, [codeQuery]);

  const effectiveStatus = (queuePreset || statusFilter || undefined) as
    | LaundryReceptionStatus
    | undefined;

  const load = useCallback(async () => {
    if (!branchId.trim()) return;
    setLoading(true);
    setError(null);
    const res = await listLaundryReceptionsAction({
      branchId,
      status: effectiveStatus,
      code: debouncedCode || undefined,
      page,
      limit: 25,
    });
    setLoading(false);
    if (!res.success) {
      setError(res.message);
      setItems([]);
      setTotal(0);
      return;
    }
    setItems(res.items);
    setTotal(res.total);

    // Escaneo exacto (código completo): un solo resultado coincidente → abrir guía.
    const exact = normalizeCodeQuery(codeQuery);
    if (exact.length >= 6 && res.items.length === 1) {
      const only = res.items[0];
      const code = normalizeCodeQuery(only.code ?? "");
      if (code === exact) {
        router.push(`/laundry/receptions/${only.id}`);
      }
    }
  }, [branchId, codeQuery, debouncedCode, effectiveStatus, page, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / 25)), [total]);

  const lookupCodeAndOpen = useCallback(
    async (raw: string) => {
      const exact = normalizeCodeQuery(raw);
      if (!exact || !branchId.trim()) return;

      const now = Date.now();
      if (lookupBusy || now - lastScanAtRef.current < SCAN_COOLDOWN_MS) return;
      lastScanAtRef.current = now;

      setLookupBusy(true);
      setScanHint(null);
      setCodeQuery(exact);
      setPage(1);
      try {
        const res = await listLaundryReceptionsAction({
          branchId,
          code: exact,
          page: 1,
          limit: 10,
        });
        if (!res.success) {
          setError(res.message);
          return;
        }
        const match =
          res.items.find((item) => normalizeCodeQuery(item.code ?? "") === exact) ??
          (res.items.length === 1 ? res.items[0] : null);
        if (match) {
          router.push(`/laundry/receptions/${match.id}`);
          return;
        }
        setScanHint(`No se encontró la guía ${exact}.`);
        setItems(res.items);
        setTotal(res.total);
      } finally {
        setLookupBusy(false);
      }
    },
    [branchId, lookupBusy, router],
  );

  const onCodeKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    void lookupCodeAndOpen(codeQuery);
  };

  const applyQueuePreset = (preset: QueuePreset) => {
    setQueuePreset(preset);
    setStatusFilter("");
    setPage(1);
    setScanHint(null);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4" data-test-id="laundry-receptions-list">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Cola de lavandería
          </h1>
          <p className="text-sm text-muted-foreground">
            Buscá por código (cámara, lector o teclado) o filtrá por estado.
            {total > 0 ? ` · ${total} resultado${total === 1 ? "" : "s"}` : null}
          </p>
        </div>
        <Button
          type="button"
          variant="primary"
          onClick={() => router.push("/laundry/receptions/new")}
          data-test-id="laundry-receptions-new-btn"
        >
          Nueva recepción
        </Button>
      </div>

      <div className="flex flex-wrap gap-2" data-test-id="laundry-receptions-queue-presets">
        {(
          [
            { id: "" as QueuePreset, label: "Todas" },
            { id: "READY" as QueuePreset, label: "Listas (retiro)" },
            { id: "IN_PROCESS" as QueuePreset, label: "En proceso" },
            { id: "RECEIVED" as QueuePreset, label: "Recibidas" },
          ] as const
        ).map((preset) => (
          <Button
            key={preset.id || "all"}
            type="button"
            size="sm"
            variant={queuePreset === preset.id ? "primary" : "outlined"}
            onClick={() => applyQueuePreset(preset.id)}
            data-test-id={`laundry-queue-preset-${preset.id || "all"}`}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      <PosBarcodeScanner
        onScan={(code) => void lookupCodeAndOpen(code)}
        paused={lookupBusy}
      />

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
        <TextField
          label="Código / escanear ticket"
          placeholder="LV000482 o escanear CODE128"
          value={codeQuery}
          onChange={(e) => {
            setCodeQuery(e.target.value);
            setPage(1);
            setScanHint(null);
          }}
          onKeyDown={onCodeKeyDown}
          selectOnFocus
          name="laundry-receptions-code-search"
          data-test-id="laundry-receptions-code-search"
        />
        <Select
          label="Estado"
          value={statusFilter || null}
          onChange={(id) => {
            setQueuePreset("");
            setStatusFilter(id ? (String(id) as LaundryReceptionStatus) : "");
            setPage(1);
          }}
          allowClear
          options={LAUNDRY_RECEPTION_STATUS_OPTIONS.filter((opt) => opt.value !== "").map(
            (opt) => ({
              id: opt.value,
              label: opt.label,
            }),
          )}
          data-test-id="laundry-receptions-status-filter"
        />
      </div>

      {scanHint ? (
        <Alert variant="warning" data-test-id="laundry-receptions-scan-hint">
          {scanHint}
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="error" data-test-id="laundry-receptions-error">
          {error}
        </Alert>
      ) : null}

      {loading ? (
        <div className="flex min-h-[12rem] items-center justify-center">
          <DotProgress />
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground" data-test-id="laundry-receptions-empty">
          No hay recepciones con los filtros actuales.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="min-w-full text-sm" data-test-id="laundry-receptions-table">
            <thead className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Código</th>
                <th className="px-3 py-2">Cliente</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Pago</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2 text-right">Saldo</th>
                <th className="px-3 py-2">Recibida</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-border/70 hover:bg-muted/20"
                  data-test-id={`laundry-reception-row-${item.id}`}
                >
                  <td className="px-3 py-2 font-medium">
                    <Link
                      href={`/laundry/receptions/${item.id}`}
                      className="text-primary hover:underline"
                      data-test-id={`laundry-reception-link-${item.id}`}
                    >
                      {item.code?.trim() || item.id.slice(0, 8)}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{item.customerNameSnapshot}</td>
                  <td className="px-3 py-2">{laundryReceptionStatusLabel(item.status)}</td>
                  <td className="px-3 py-2">{laundryPaymentModeLabel(item.paymentMode)}</td>
                  <td className="px-3 py-2 text-right">{formatMoney(item.servicesTotal)}</td>
                  <td className="px-3 py-2 text-right">{formatMoney(item.balanceDue)}</td>
                  <td className="px-3 py-2">{formatDate(item.receivedAt ?? item.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outlined"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            data-test-id="laundry-receptions-prev-page"
          >
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          <Button
            type="button"
            variant="outlined"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
            data-test-id="laundry-receptions-next-page"
          >
            Siguiente
          </Button>
        </div>
      ) : null}
    </div>
  );
}
