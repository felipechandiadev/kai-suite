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
import { AdminTable, CoreError } from "@/shared/components/AdminTable";
import { LiteDataGrid, slicePage, type DataGridColumn } from "@/shared/components/LiteDataGrid";
import { useCollectionSearchQuery } from "@/shared/hooks/useCollectionSearchQuery";
import { toUserMessage } from "@/lib/errors";
import { formatClp } from "@/lib/format";
import { litePaymentLabel } from "@/sections/pos/lib/lite-payment-labels";
import { liteAdminApi, type LiteSaleRow } from "../api/lite-admin.api";

const STATUS_LABEL: Record<string, string> = {
  COMPLETED: "Completada",
  VOIDED: "Anulada",
  CANCELLED: "Cancelada",
};

function statusBadgeVariant(
  status: string,
): "success-outlined" | "secondary-outlined" | "warning-outlined" | "info-outlined" {
  const s = status.toUpperCase();
  if (s === "COMPLETED") return "success-outlined";
  if (s === "VOIDED" || s === "CANCELLED") return "secondary-outlined";
  return "info-outlined";
}

function methodDisplay(row: LiteSaleRow): string {
  const payments = row.payments?.filter((p) => (Number(p.amount) || 0) > 0) ?? [];
  if (payments.length > 1) return "Mixto";
  if (payments.length === 1) return litePaymentLabel(payments[0]!.method);
  return litePaymentLabel(row.method);
}

export function SalesTransactionsPage() {
  const q = useCollectionSearchQuery();
  const [items, setItems] = useState<LiteSaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<LiteSaleRow | null>(null);
  const [voidOpen, setVoidOpen] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [voidBusy, setVoidBusy] = useState(false);
  const [voidError, setVoidError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    void liteAdminApi
      .sales()
      .then((r) => setItems(r.items ?? []))
      .catch((e) => setError(toUserMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const filtered = useMemo(() => {
    if (!q) return items;
    return items.filter((r) => {
      const hay =
        `${r.id} ${r.documentNumber ?? ""} ${r.method} ${r.userName ?? ""} ${r.status ?? ""} ${r.total}`.toLowerCase();
      return hay.includes(q);
    });
  }, [items, q]);

  async function openDetail(id: string) {
    try {
      const d = await liteAdminApi.sale(id);
      setDetail(d);
      setVoidError(null);
    } catch (e) {
      setError(toUserMessage(e));
    }
  }

  async function confirmVoid() {
    if (!detail) return;
    setVoidBusy(true);
    setVoidError(null);
    try {
      await liteAdminApi.voidSale(detail.id, {
        reason: voidReason.trim() || undefined,
      });
      setVoidOpen(false);
      setVoidReason("");
      setDetail(null);
      reload();
    } catch (e) {
      setVoidError(toUserMessage(e));
    } finally {
      setVoidBusy(false);
    }
  }

  const columns: DataGridColumn[] = useMemo(() => {
    function SaleActionsCell({ row }: { row: LiteSaleRow }) {
      return (
        <div className="flex items-center justify-center">
          <IconButton
            icon="MoreHorizontal"
            variant="action"
            size="sm"
            ariaLabel="Ver detalle de venta"
            title="Detalle"
            onClick={() => void openDetail(row.id)}
            data-test-id={`sale-detail-${row.id}`}
          />
        </div>
      );
    }

    return [
      {
        field: "createdAt",
        headerName: "Fecha",
        width: 170,
        minWidth: 150,
        sortable: false,
        valueGetter: ({ row }) => {
          const v = (row as LiteSaleRow).createdAt;
          return v ? new Date(v).toLocaleString("es-CL") : "—";
        },
      },
      {
        field: "documentNumber",
        headerName: "Documento",
        width: 150,
        minWidth: 130,
        sortable: false,
        valueGetter: ({ row }) => {
          const r = row as LiteSaleRow;
          return r.documentNumber ?? r.id.slice(0, 8);
        },
      },
      {
        field: "userName",
        headerName: "Usuario",
        flex: 0.8,
        minWidth: 120,
        sortable: false,
        valueGetter: ({ row }) => (row as LiteSaleRow).userName?.trim() || "—",
      },
      {
        field: "method",
        headerName: "Método",
        width: 140,
        minWidth: 120,
        sortable: false,
        renderCell: ({ row }) => (
          <Badge variant="info-outlined">{methodDisplay(row as LiteSaleRow)}</Badge>
        ),
      },
      {
        field: "status",
        headerName: "Estado",
        width: 130,
        minWidth: 110,
        sortable: false,
        renderCell: ({ row }) => {
          const status = String((row as LiteSaleRow).status ?? "COMPLETED").toUpperCase();
          return (
            <Badge variant={statusBadgeVariant(status)}>
              {STATUS_LABEL[status] ?? status}
            </Badge>
          );
        },
      },
      {
        field: "total",
        headerName: "Total",
        width: 130,
        minWidth: 110,
        align: "right",
        sortable: false,
        valueGetter: ({ row }) => formatClp((row as LiteSaleRow).total),
      },
      {
        field: "actions",
        headerName: "",
        width: 72,
        minWidth: 72,
        maxWidth: 72,
        align: "center",
        sortable: false,
        filterable: false,
        actionComponent: SaleActionsCell,
      },
    ];
  }, []);

  const detailStatus = String(detail?.status ?? "COMPLETED").toUpperCase();
  const canVoid = detailStatus === "COMPLETED";
  const detailPayments =
    detail?.payments?.filter((p) => (Number(p.amount) || 0) > 0) ??
    (detail ? [{ method: detail.method, amount: detail.total }] : []);

  return (
    <CollectionPageLayout
      title="Transacciones"
      showSearch
      data-test-id="sales-transactions-page"
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
        data-test-id="sales-transactions-data-grid"
      />

      <Dialog
        open={!!detail}
        onClose={() => setDetail(null)}
        title="Detalle de venta"
        size="md"
        actions={
          <>
            {canVoid ? (
              <Button
                type="button"
                variant="outlined"
                onClick={() => {
                  setVoidReason("");
                  setVoidError(null);
                  setVoidOpen(true);
                }}
                data-test-id="sale-void-open"
              >
                Anular
              </Button>
            ) : null}
            <Button type="button" variant="outlined" onClick={() => setDetail(null)}>
              Cerrar
            </Button>
          </>
        }
      >
        {detail ? (
          <div className="space-y-3 text-sm">
            <p>
              <span className="text-muted-foreground">Documento:</span>{" "}
              {detail.documentNumber ?? detail.id}
            </p>
            <p>
              <span className="text-muted-foreground">Fecha:</span>{" "}
              {new Date(detail.createdAt).toLocaleString("es-CL")}
            </p>
            <p>
              <span className="text-muted-foreground">Usuario:</span>{" "}
              {detail.userName?.trim() || "—"}
            </p>
            <p className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground">Estado:</span>
              <Badge variant={statusBadgeVariant(detailStatus)}>
                {STATUS_LABEL[detailStatus] ?? detailStatus}
              </Badge>
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground">Pago:</span>
              {detailPayments.map((p, i) => (
                <Badge key={`${p.method}-${i}`} variant="info-outlined">
                  {litePaymentLabel(p.method)}
                  {detailPayments.length > 1 ? ` · ${formatClp(p.amount)}` : ""}
                </Badge>
              ))}
            </div>
            <p>
              <span className="text-muted-foreground">Total:</span> {formatClp(detail.total)}
            </p>
            <AdminTable
              columns={["Producto", "Cant.", "P. unit.", "Subtotal"]}
              rows={(detail.lines ?? []).map((l) => {
                const subtotal =
                  l.subtotal != null
                    ? Number(l.subtotal)
                    : Number(l.qty) * Number(l.unitPrice);
                return [
                  <div key="product" className="min-w-0">
                    <div className="font-medium text-foreground">
                      {l.name ?? l.variantId}
                    </div>
                    {l.sku ? (
                      <div className="text-xs text-muted-foreground">{l.sku}</div>
                    ) : null}
                    {l.attributesLabel ? (
                      <div className="text-xs text-muted-foreground">
                        {l.attributesLabel}
                      </div>
                    ) : null}
                  </div>,
                  String(l.qty),
                  formatClp(l.unitPrice),
                  formatClp(subtotal),
                ];
              })}
              empty="Sin líneas"
            />
          </div>
        ) : null}
      </Dialog>

      <Dialog
        open={voidOpen}
        onClose={() => {
          if (!voidBusy) setVoidOpen(false);
        }}
        title="Anular venta"
        actions={
          <>
            <Button
              type="button"
              variant="outlined"
              disabled={voidBusy}
              onClick={() => setVoidOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="primary"
              loading={voidBusy}
              disabled={voidBusy}
              onClick={() => void confirmVoid()}
              data-test-id="sale-void-confirm"
            >
              Confirmar anulación
            </Button>
          </>
        }
        alertArea={voidError ? <Alert variant="error">{voidError}</Alert> : undefined}
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            La venta no se elimina: queda marcada como <strong>Anulada</strong> y se reintegra el
            stock físico.
          </p>
          <TextField
            label="Motivo (opcional)"
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
            data-test-id="sale-void-reason"
          />
        </div>
      </Dialog>
    </CollectionPageLayout>
  );
}
