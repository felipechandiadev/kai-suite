import { useEffect, useMemo, useState } from "react";
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
import { CashSessionDetailDialog } from "@/sections/pos/components/CashSessionDetailDialog";

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Abierta",
  CLOSED: "Cerrada",
  RECONCILED: "Conciliada",
};

export function CashSessionsPage() {
  const q = useCollectionSearchQuery();
  const { items, loading, error, reload } = useLiteList<LiteCashSession>("/lite/cash-sessions");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  const cashSessionId = usePosCartStore((s) => s.cashSessionId);
  const resetSession = usePosCartStore((s) => s.resetSession);

  const [detailSessionId, setDetailSessionId] = useState<string | null>(null);
  const [detailCaption, setDetailCaption] = useState<string | undefined>();

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

  function openDetail(session: LiteCashSession) {
    const status = STATUS_LABEL[session.status ?? ""] ?? session.status ?? "";
    const opening = session.openingAmount ?? session.openingFloat ?? 0;
    setDetailCaption(
      `${session.pointOfSaleName ?? "POS"} · ${status} · Fondo de apertura ${formatClp(opening)}`,
    );
    setDetailSessionId(session.id);
  }

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
            onClick={() => openDetail(row)}
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
        field: "status",
        headerName: "Estado",
        flex: 1,
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
        flex: 1,
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
        flex: 1,
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
        headerName: "Fondo de apertura",
        flex: 1,
        width: 180,
        minWidth: 160,
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
  }, []);

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

      <CashSessionDetailDialog
        open={detailSessionId != null}
        sessionId={detailSessionId}
        caption={detailCaption}
        onClose={() => setDetailSessionId(null)}
      />

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
