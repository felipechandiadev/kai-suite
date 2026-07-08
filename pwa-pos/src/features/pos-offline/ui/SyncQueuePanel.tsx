"use client";

import { Dialog, Button } from "@/shared/admin-shared";
import { usePosOffline } from "../hooks/use-pos-offline";
import { retryOfflineCommand } from "../application/sync-queue.usecase";
import type { PosOfflineCommand } from "../domain/offline-command.types";

type SyncQueuePanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendiente",
  SYNCING: "Sincronizando",
  SYNCED: "Sincronizada",
  FAILED: "Fallida",
  CONFLICT: "Conflicto",
};

function conflictHint(message: string | null | undefined): string | null {
  const m = (message ?? "").toLowerCase();
  if (!m) return null;
  if (m.includes("stock")) {
    return "Stock insuficiente en el servidor. Ajusta inventario o anula la venta local antes de reintentar.";
  }
  if (m.includes("folio") || m.includes("caf")) {
    return "Conflicto de folio fiscal. Revisa asignación de folios en administración SII.";
  }
  if (m.includes("sesión") || m.includes("session") || m.includes("caja")) {
    return "La sesión de caja puede estar cerrada. Abre caja o contacta a soporte.";
  }
  return "Revisa el detalle del error, corrige en administración y reintenta.";
}

function saleLineSummary(cmd: PosOfflineCommand): string | null {
  if (cmd.commandType !== "SALE") return null;
  const lines = (cmd.payload as { lines?: Array<{ productName?: string; quantity?: number }> })
    .lines;
  if (!Array.isArray(lines) || lines.length === 0) return null;
  const preview = lines
    .slice(0, 3)
    .map((l) => {
      const name = l.productName?.trim() || "Item";
      const qty = Number(l.quantity) || 0;
      return `${name} ×${qty}`;
    })
    .join(" · ");
  const extra = lines.length > 3 ? ` (+${lines.length - 3} más)` : "";
  return `${preview}${extra}`;
}

export function SyncQueuePanel({ open, onOpenChange }: SyncQueuePanelProps) {
  const { commands, refreshQueue, userName, isBackendReachable } = usePosOffline();
  const visible = commands.filter((c) => c.status !== "SYNCED");

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Cola de sincronización">
      <div className="flex flex-col gap-3 min-w-[320px] max-w-lg">
        {!isBackendReachable ? (
          <p className="text-sm text-muted-foreground">
            Sin conexión al servidor. Las ventas se enviarán al reconectar.
          </p>
        ) : null}

        {visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay ventas pendientes de sincronizar.</p>
        ) : (
          <ul className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto">
            {visible.map((cmd) => {
              const lineSummary = saleLineSummary(cmd);
              return (
              <li
                key={cmd.id}
                className="rounded-md border border-border p-3 text-sm flex flex-col gap-1"
              >
                <div className="flex justify-between gap-2">
                  <span className="font-medium">
                    {cmd.commandType} · {cmd.localDocumentNumber}
                  </span>
                  <span className="text-muted-foreground">{STATUS_LABEL[cmd.status] ?? cmd.status}</span>
                </div>
                {lineSummary ? (
                  <span className="text-xs text-muted-foreground">{lineSummary}</span>
                ) : null}
                <span className="text-xs text-muted-foreground">
                  {new Date(cmd.createdAt).toLocaleString("es-CL")}
                </span>
                {cmd.serverDocumentNumber ? (
                  <span className="text-xs text-muted-foreground">
                    Servidor: {cmd.serverDocumentNumber}
                  </span>
                ) : null}
                {cmd.lastError ? (
                  <span className="text-xs text-destructive">{cmd.lastError}</span>
                ) : null}
                {cmd.status === "CONFLICT" ? (
                  <span className="text-xs text-muted-foreground">{conflictHint(cmd.lastError)}</span>
                ) : null}
                {(cmd.status === "FAILED" || cmd.status === "CONFLICT") && userName ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="self-start mt-1"
                    onClick={() => void retryOfflineCommand(cmd.id, userName).then(() => refreshQueue())}
                  >
                    Reintentar
                  </Button>
                ) : null}
              </li>
            );
            })}
          </ul>
        )}

        <p className="text-xs text-muted-foreground">
          Ayuda: ventas en conflicto requieren acción en administración (stock, folios o sesión de caja).
        </p>

        <div className="flex justify-end">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
