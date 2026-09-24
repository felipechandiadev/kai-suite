import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  CollectionPageLayout,
  Dialog,
  IconButton,
  TextField,
} from "@kai/ui";
import type { LiteCashSession } from "@/lib/lite-api";
import { useLiteList } from "@/shared/hooks/useLiteList";
import { useCollectionSearchQuery } from "@/shared/hooks/useCollectionSearchQuery";
import { CoreError } from "@/shared/components/AdminTable";
import { LiteDataGrid, slicePage, type DataGridColumn } from "@/shared/components/LiteDataGrid";
import { formatClp } from "@/lib/format";
import { liteFetch } from "@/lib/lite-client";
import { toUserMessage } from "@/lib/errors";
import { usePosCartStore } from "@/sections/pos/store/pos-cart.store";
import { litePaymentLabel } from "@/sections/pos/lib/lite-payment-labels";

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Abierta",
  CLOSED: "Cerrada",
  RECONCILED: "Conciliada",
};

type MovementRow = {
  id: string;
  kind?: "sale" | "deposit" | "withdrawal";
  documentNumber: string;
  createdAt: string;
  total: number;
  method: string;
  reason?: string | null;
};

const KIND_LABEL: Record<string, string> = {
  sale: "Venta",
  deposit: "Ingreso",
  withdrawal: "Egreso",
};

export function CashSessionsPage() {
  const q = useCollectionSearchQuery();
  const { items, loading, error, reload } = useLiteList<LiteCashSession>("/lite/cash-sessions");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  const cashSessionId = usePosCartStore((s) => s.cashSessionId);
  const resetSession = usePosCartStore((s) => s.resetSession);

  const [movementsFor, setMovementsFor] = useState<LiteCashSession | null>(null);
  const [movements, setMovements] = useState<MovementRow[]>([]);
  const [movementsLoading, setMovementsLoading] = useState(false);
  const [movementsError, setMovementsError] = useState<string | null>(null);

  const [closeFor, setCloseFor] = useState<LiteCashSession | null>(null);
  const [closingAmount, setClosingAmount] = useState("");
  const [closeBusy, setCloseBusy] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!q) return items;
    return items.filter((r) => {
      const hay = `${r.pointOfSaleName ?? ""} ${r.pointOfSaleId ?? ""} ${r.status ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [items, q]);

  const loadMovements = useCallback(async (session: LiteCashSession) => {
    setMovementsFor(session);
    setMovements([]);
    setMovementsError(null);
    setMovementsLoading(true);
    try {
      const res = await liteFetch<{ items: MovementRow[] }>(
        `/lite/cash-sessions/${session.id}/movements`,
      );
      setMovements(res.items ?? []);
    } catch (e) {
      setMovementsError(toUserMessage(e));
    } finally {
      setMovementsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!closeFor) return;
    const opening = closeFor.openingAmount ?? closeFor.openingFloat ?? 0;
    setClosingAmount(String(opening || ""));
    setCloseError(null);
  }, [closeFor]);

  async function submitClose() {
    if (!closeFor) return;
    const amount = Number(String(closingAmount).replace(/\D/g, ""));
    if (!Number.isFinite(amount) || amount < 0) {
      setCloseError("Monto inválido");
      return;
    }
    setCloseBusy(true);
    setCloseError(null);
    try {
      await liteFetch(`/lite/cash-sessions/${closeFor.id}/close`, {
        method: "POST",
        body: JSON.stringify({ closingAmount: amount }),
      });
      if (cashSessionId === closeFor.id) {
        resetSession();
      }
      setCloseFor(null);
      reload();
    } catch (e) {
      setCloseError(toUserMessage(e));
    } finally {
      setCloseBusy(false);
    }
  }

  const columns: DataGridColumn[] = useMemo(() => {
    function SessionActionsCell({ row }: { row: LiteCashSession }) {
      const isOpen = String(row.status ?? "").toUpperCase() === "OPEN";
      return (
        <div className="flex items-center justify-center gap-0.5">
          <IconButton
            icon="MoreHorizontal"
            variant="action"
            size="sm"
            ariaLabel="Ver movimientos de la sesión"
            title="Movimientos"
            onClick={() => void loadMovements(row)}
            data-test-id={`cash-session-movements-${row.id}`}
          />
          {isOpen ? (
            <IconButton
              icon="Lock"
              variant="action"
              size="sm"
              ariaLabel="Cerrar sesión de caja"
              title="Cerrar sesión"
              onClick={() => setCloseFor(row)}
              data-test-id={`cash-session-close-${row.id}`}
            />
          ) : null}
        </div>
      );
    }

    return [
      {
        field: "pointOfSaleName",
        headerName: "POS",
        flex: 1,
        minWidth: 160,
        sortable: false,
        valueGetter: ({ row }) => {
          const r = row as LiteCashSession;
          return r.pointOfSaleName ?? r.pointOfSaleId ?? "—";
        },
      },
      {
        field: "status",
        headerName: "Estado",
        width: 130,
        minWidth: 120,
        sortable: false,
        renderCell: ({ row }) => {
          const status = (row as LiteCashSession).status ?? "";
          const variant =
            status === "OPEN"
              ? "success-outlined"
              : status === "CLOSED"
                ? "secondary-outlined"
                : "info-outlined";
          return (
            <Badge variant={variant}>
              {STATUS_LABEL[status] ?? (status || "—")}
            </Badge>
          );
        },
      },
      {
        field: "openedAt",
        headerName: "Apertura",
        width: 180,
        minWidth: 160,
        sortable: false,
        valueGetter: ({ row }) => {
          const v = (row as LiteCashSession).openedAt;
          return v ? new Date(v).toLocaleString("es-CL") : "—";
        },
      },
      {
        field: "closedAt",
        headerName: "Cierre",
        width: 180,
        minWidth: 160,
        sortable: false,
        valueGetter: ({ row }) => {
          const v = (row as LiteCashSession).closedAt;
          return v ? new Date(v).toLocaleString("es-CL") : "—";
        },
      },
      {
        field: "openingAmount",
        headerName: "Fondo",
        width: 140,
        minWidth: 120,
        align: "right",
        sortable: false,
        valueGetter: ({ row }) => {
          const r = row as LiteCashSession;
          const amount = r.openingAmount ?? r.openingFloat;
          return amount != null ? formatClp(amount) : "—";
        },
      },
      {
        field: "actions",
        headerName: "",
        width: 96,
        minWidth: 96,
        maxWidth: 96,
        align: "center",
        sortable: false,
        filterable: false,
        actionComponent: SessionActionsCell,
      },
    ];
  }, [loadMovements]);

  const salesTotal = useMemo(
    () =>
      movements
        .filter((m) => !m.kind || m.kind === "sale")
        .reduce((acc, m) => acc + Number(m.total ?? 0), 0),
    [movements],
  );

  return (
    <CollectionPageLayout
      title="Sesiones de caja"
      showSearch
      data-test-id="cash-sessions-page"
    >
      <CoreError message={error} />
      <LiteDataGrid
        columns={columns}
        rows={slicePage(filtered, page, limit)}
        loading={loading}
        totalRows={filtered.length}
        totalGeneral={filtered.length}
        page={page}
        limit={limit}
        onPaginationChange={(next) => {
          setPage(next.page);
          setLimit(next.limit);
        }}
        pinActionsColumn
        data-test-id="cash-sessions-data-grid"
      />

      <Dialog
        open={!!movementsFor}
        onClose={() => setMovementsFor(null)}
        title="Movimientos de sesión"
        size="lg"
        actions={
          <Button type="button" variant="outlined" onClick={() => setMovementsFor(null)}>
            Cerrar
          </Button>
        }
      >
        {movementsFor ? (
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              {movementsFor.pointOfSaleName ?? "POS"} ·{" "}
              {STATUS_LABEL[movementsFor.status ?? ""] ?? movementsFor.status} · Fondo de apertura{" "}
              {formatClp(movementsFor.openingAmount ?? movementsFor.openingFloat ?? 0)}
            </p>
            {movementsError ? <Alert variant="error">{movementsError}</Alert> : null}
            {movementsLoading ? (
              <p className="text-muted-foreground">Cargando…</p>
            ) : movementsError ? null : movements.length === 0 ? (
              <p className="text-muted-foreground">Sin movimientos en esta sesión.</p>
            ) : (
              <>
                <div className="max-h-[50vh] overflow-auto rounded-lg border border-border">
                  <table className="w-full min-w-0 text-left text-sm">
                    <thead className="sticky top-0 bg-muted/40 text-xs text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 font-medium">Fecha</th>
                        <th className="px-3 py-2 font-medium">Tipo</th>
                        <th className="px-3 py-2 font-medium">Documento</th>
                        <th className="px-3 py-2 font-medium">Medio de pago</th>
                        <th className="px-3 py-2 text-right font-medium">Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movements.map((m) => {
                        const kind = m.kind ?? "sale";
                        return (
                          <tr key={m.id} className="border-t border-border/70">
                            <td className="px-3 py-2 whitespace-nowrap">
                              {new Date(m.createdAt).toLocaleString("es-CL")}
                            </td>
                            <td className="px-3 py-2">{KIND_LABEL[kind] ?? kind}</td>
                            <td className="px-3 py-2 font-mono text-xs">{m.documentNumber}</td>
                            <td className="px-3 py-2">
                              {litePaymentLabel(m.method || "CASH")}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {kind === "withdrawal" ? "−" : ""}
                              {formatClp(m.total)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-right text-sm font-medium text-foreground">
                  Total ventas: {formatClp(salesTotal)}
                </p>
              </>
            )}
          </div>
        ) : null}
      </Dialog>

      <Dialog
        open={!!closeFor}
        onClose={() => setCloseFor(null)}
        title="Cerrar sesión de caja"
        actions={
          <>
            <Button type="button" variant="outlined" onClick={() => setCloseFor(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              loading={closeBusy}
              disabled={closeBusy}
              onClick={() => void submitClose()}
            >
              Cerrar sesión
            </Button>
          </>
        }
        alertArea={closeError ? <Alert variant="error">{closeError}</Alert> : undefined}
      >
        {closeFor ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              {closeFor.pointOfSaleName ?? "POS"} · Fondo{" "}
              {formatClp(closeFor.openingAmount ?? closeFor.openingFloat ?? 0)}
            </p>
            <TextField
              label="Efectivo contado"
              type="currency"
              currencySymbol="$"
              value={closingAmount}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, "");
                setClosingAmount(raw);
              }}
            />
          </div>
        ) : null}
      </Dialog>
    </CollectionPageLayout>
  );
}
