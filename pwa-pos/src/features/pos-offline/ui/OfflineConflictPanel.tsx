"use client";

import { Button } from "@kai/ui";
import { usePosOffline } from "../hooks/use-pos-offline";
import {
  discardOfflineCommand,
  retryOfflineCommand,
} from "../application/sync-queue.usecase";

const COMMAND_LABEL: Record<string, string> = {
  SALE: "Venta",
  CASH_MOVEMENT: "Movimiento caja",
  HUB_DEPOSIT: "Ingreso hub",
  HUB_WITHDRAWAL: "Egreso hub",
  CLOSE_SESSION: "Cierre caja",
};

export function OfflineConflictPanel() {
  const { commands, refreshQueue, userName } = usePosOffline();
  const conflicts = commands.filter((c) => c.status === "CONFLICT");
  const failed = commands.filter((c) => c.status === "FAILED");

  if (conflicts.length === 0 && failed.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay operaciones en conflicto ni fallidas.
      </p>
    );
  }

  const actionable = [...conflicts, ...failed];

  return (
    <div className="space-y-3" data-test-id="offline-conflict-panel">
      <p className="text-sm text-muted-foreground">
        Resuelve conflictos de stock, folio o sesión antes de cerrar caja offline.
      </p>
      <ul className="space-y-2">
        {actionable.map((cmd) => (
          <li
            key={cmd.id}
            className="rounded-md border border-border p-3 text-sm flex flex-col gap-2"
          >
            <div className="flex justify-between gap-2">
              <span className="font-medium">
                {COMMAND_LABEL[cmd.commandType] ?? cmd.commandType} · {cmd.localDocumentNumber}
              </span>
              <span className="text-muted-foreground">{cmd.status}</span>
            </div>
            {cmd.lastError ? (
              <span className="text-xs text-destructive">{cmd.lastError}</span>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {userName ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    void retryOfflineCommand(cmd.id, userName).then(() => refreshQueue())
                  }
                >
                  Reintentar
                </Button>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void discardOfflineCommand(cmd.id).then(() => refreshQueue())}
              >
                Descartar local
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
