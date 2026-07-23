"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Alert, Button, ButtonPill, TextField } from "@kai/ui";
import {
  createDiningBoardDisplayAction,
  listDiningBoardDisplaysAction,
  revokeDiningBoardDisplayAction,
} from "@/features/dining-board/actions/dining-board-displays.action";
import type { BoardDisplayRow } from "@/features/dining-board/infrastructure/dining-board-displays.request";

type Props = {
  branchId: string;
};

export function PosKaiBoardSettingsSection({ branchId }: Props) {
  const [rows, setRows] = useState<BoardDisplayRow[]>([]);
  const [name, setName] = useState("Monitor salón");
  const [error, setError] = useState<string | null>(null);
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const refresh = useCallback(() => {
    if (!branchId.trim()) return;
    startTransition(() => {
      void listDiningBoardDisplaysAction(branchId).then((res) => {
        if (!res.success) {
          setError(res.message);
          return;
        }
        setError(null);
        setRows(res.rows.filter((r) => r.isActive && !r.revokedAt));
      });
    });
  }, [branchId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const onCreate = () => {
    setError(null);
    setCreatedToken(null);
    startTransition(() => {
      void createDiningBoardDisplayAction({
        branchId,
        name: name.trim() || "Kai Board",
      }).then((res) => {
        if (!res.success) {
          setError(res.message);
          return;
        }
        if (res.row.token) setCreatedToken(res.row.token);
        refresh();
      });
    });
  };

  const onRevoke = (id: string) => {
    startTransition(() => {
      void revokeDiningBoardDisplayAction(id).then((res) => {
        if (!res.success) {
          setError(res.message);
          return;
        }
        refresh();
      });
    });
  };

  return (
    <div className="space-y-4" data-test-id="pos-kai-board-settings">
      <p className="text-sm text-muted-foreground">
        Genere un código de 6 dígitos por monitor TV. En Kai Board (puerto 5069)
        ingréselo en /setup. Sin login de cajero en la TV.
      </p>

      {error ? <Alert variant="error">{error}</Alert> : null}

      {createdToken ? (
        <Alert variant="success" data-test-id="pos-kai-board-token-once">
          <p className="m-0 font-medium">
            Código de pantalla (cópielo ahora; no se vuelve a mostrar):
          </p>
          <p
            className="mt-2 text-center text-4xl font-bold tracking-[0.35em] tabular-nums"
            data-test-id="pos-kai-board-token-value"
          >
            {createdToken}
          </p>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <TextField
            label="Nombre de la pantalla"
            name="boardName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            data-test-id="pos-kai-board-name"
          />
        </div>
        <ButtonPill
          type="button"
          disabled={pending || !branchId.trim()}
          onClick={onCreate}
          data-test-id="pos-kai-board-create"
        >
          Crear pantalla
        </ButtonPill>
      </div>

      <ul className="divide-y divide-border rounded-lg border border-border">
        {rows.length === 0 ? (
          <li className="p-3 text-sm text-muted-foreground">
            No hay pantallas activas para esta sucursal.
          </li>
        ) : (
          rows.map((row) => (
            <li
              key={row.id}
              className="flex items-center justify-between gap-3 p-3"
              data-test-id={`pos-kai-board-row-${row.id}`}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{row.name}</p>
                <p className="text-xs text-muted-foreground">
                  Creada {new Date(row.createdAt).toLocaleString("es-CL")}
                  {row.lastSeenAt
                    ? ` · vista ${new Date(row.lastSeenAt).toLocaleString("es-CL")}`
                    : ""}
                </p>
              </div>
              <Button
                type="button"
                variant="outlined"
                size="sm"
                disabled={pending}
                onClick={() => onRevoke(row.id)}
                data-test-id={`pos-kai-board-revoke-${row.id}`}
              >
                Revocar
              </Button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
