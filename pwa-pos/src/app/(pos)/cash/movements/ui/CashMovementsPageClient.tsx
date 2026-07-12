"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DataGrid, type DataGridColumn, Alert, IconButton, DotProgress, Badge } from "@kai/ui";
import { CashMovementReprintPreviewDialog } from "@/app/(pos)/cash/movements/ui/CashMovementReprintPreviewDialog";
import { CashMovementSaleDetailDialog } from "@/app/(pos)/cash/movements/ui/CashMovementSaleDetailDialog";
import { canReprintPosSaleReceipt } from "@/features/pos-print/lib/reprint-sale-receipt";
import {
  formatSaleDocumentFolio,
  saleDocumentTypeBadgeVariant,
  saleDocumentTypeLabel,
} from "@/features/sales-transactions/lib/sale-document-type";
import { paymentMethodLabelEs } from "@/features/pos-payment-methods/lib/payment-method-label";
import { posTransactionTypeLabel } from "@/features/transactions/lib/pos-transaction-type-label";
import { listCashSessionMovementsAction } from "@/features/session/actions/cash-session-movements.action";
import type { CashSessionMovementRow } from "@/features/session/types/cash-session-movement.types";
import { readPosContextClient } from "@/features/session/lib/pos-context-storage";

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function formatDateTimeLocal(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function directionLabel(d: CashSessionMovementRow["direction"]): string {
  if (d === "IN") return "Entrada";
  if (d === "OUT") return "Salida";
  return "—";
}

const currencyFmt = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

/** Filas de vuelto usan id sintético `{txId}:change`; la reimpresión apunta a la venta. */
function movementTransactionId(row: CashSessionMovementRow): string {
  const id = row.id.trim();
  if (id.endsWith(":change")) {
    return id.slice(0, -":change".length);
  }
  return id;
}

export default function CashMovementsPageClient() {
  const [cashSessionId, setCashSessionId] = useState<string | null>(null);
  const [rows, setRows] = useState<CashSessionMovementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [printNotice, setPrintNotice] = useState<string | null>(null);
  const [detailTxId, setDetailTxId] = useState<string | null>(null);
  const [detailDocNumber, setDetailDocNumber] = useState<string | null>(null);
  const [reprintTxId, setReprintTxId] = useState<string | null>(null);
  const [reprintDocNumber, setReprintDocNumber] = useState<string | null>(null);

  useEffect(() => {
    const ctx = readPosContextClient();
    const id = typeof ctx?.cashSessionId === "string" ? ctx.cashSessionId.trim() : "";
    setCashSessionId(id || null);
  }, []);

  const load = useCallback(async (sessionId: string) => {
    setLoading(true);
    setError(null);
    const res = await listCashSessionMovementsAction(sessionId);
    setLoading(false);
    if (!res.success) {
      setRows([]);
      setError(res.message);
      return;
    }
    setRows(res.movements);
  }, []);

  useEffect(() => {
    if (cashSessionId === null) return;
    if (!cashSessionId) {
      setLoading(false);
      setRows([]);
      setError("No hay sesión de caja activa. Configura el punto de venta y abre caja desde la pantalla inicial.");
      return;
    }
    void load(cashSessionId);
  }, [cashSessionId, load]);

  const gridRows = useMemo(
    () =>
      rows
        .filter(
          (r) =>
            r.transactionType !== "PAYMENT_IN" && r.transactionType !== "CASH_CHANGE",
        )
        .map((r) => ({
          ...r,
          typeLabel: posTransactionTypeLabel(r.transactionType),
          directionLabel: directionLabel(r.direction),
          createdAtLabel: formatDateTimeLocal(r.createdAt),
          totalLabel: currencyFmt.format(Number(r.total) || 0),
          paymentMethodLabel: paymentMethodLabelEs(r.paymentMethod, r.paymentMethodLabel),
        })),
    [rows],
  );

  const openReprintPreview = useCallback((row: CashSessionMovementRow) => {
    setReprintTxId(movementTransactionId(row));
    setReprintDocNumber(row.documentNumber?.trim() || null);
  }, []);

  const closeReprintPreview = useCallback(() => {
    setReprintTxId(null);
    setReprintDocNumber(null);
  }, []);

  const openSaleDetail = useCallback((row: CashSessionMovementRow) => {
    setDetailTxId(movementTransactionId(row));
    setDetailDocNumber(row.documentNumber?.trim() || null);
  }, []);

  const closeSaleDetail = useCallback(() => {
    setDetailTxId(null);
    setDetailDocNumber(null);
  }, []);

  const columns: DataGridColumn[] = useMemo(
    () => [
      {
        field: "createdAtLabel",
        headerName: "Fecha y hora",
        minWidth: 150,
        flex: 1,
        sortable: false,
        filterable: false,
      },
      {
        field: "documentNumber",
        headerName: "Documento",
        minWidth: 110,
        flex: 0.8,
        sortable: false,
        filterable: false,
      },
      {
        field: "documentType",
        headerName: "DTE",
        width: 100,
        minWidth: 88,
        sortable: false,
        filterable: false,
        valueGetter: ({ row }: { row: CashSessionMovementRow }) =>
          saleDocumentTypeLabel(row.documentType),
        renderCell: ({ row }: { row: CashSessionMovementRow }) => (
          <Badge variant={saleDocumentTypeBadgeVariant(row.documentType)}>
            {saleDocumentTypeLabel(row.documentType)}
          </Badge>
        ),
      },
      {
        field: "documentFolio",
        headerName: "Folio DTE",
        minWidth: 96,
        flex: 0.5,
        sortable: false,
        filterable: false,
        valueGetter: ({ row }: { row: CashSessionMovementRow }) =>
          formatSaleDocumentFolio(row.documentType, row.documentFolio),
        renderCell: ({ row }: { row: CashSessionMovementRow }) => {
          const folio = formatSaleDocumentFolio(row.documentType, row.documentFolio);
          if (folio === "—") {
            return <span className="text-muted-foreground">—</span>;
          }
          return <span className="font-mono text-xs">{folio}</span>;
        },
      },
      {
        field: "typeLabel",
        headerName: "Tipo",
        minWidth: 160,
        flex: 1.2,
        sortable: false,
        filterable: false,
      },
      {
        field: "directionLabel",
        headerName: "Sentido",
        minWidth: 90,
        flex: 0.6,
        sortable: false,
        filterable: false,
      },
      {
        field: "totalLabel",
        headerName: "Total",
        minWidth: 110,
        flex: 0.8,
        align: "right",
        headerAlign: "right",
        sortable: false,
        filterable: false,
      },
      {
        field: "paymentMethodLabel",
        headerName: "Medio de pago",
        minWidth: 110,
        flex: 0.9,
        sortable: false,
        filterable: false,
        valueGetter: ({ value }: { value: string | null | undefined }) =>
          value?.trim() ? String(value) : "—",
      },
      {
        field: "userFullName",
        headerName: "Usuario",
        minWidth: 140,
        flex: 1,
        sortable: false,
        filterable: false,
        valueGetter: ({ row }: { row: { userFullName: string | null; userUserName: string | null } }) =>
          row.userFullName?.trim() || row.userUserName?.trim() || "—",
      },
      {
        field: "notes",
        headerName: "Notas",
        minWidth: 120,
        flex: 1,
        sortable: false,
        filterable: false,
        valueGetter: ({ value }: { value: string | null }) => (value && String(value).trim() ? String(value) : "—"),
      },
      {
        field: "actions",
        headerName: "",
        width: 88,
        minWidth: 88,
        maxWidth: 88,
        sortable: false,
        filterable: false,
        align: "center",
        headerAlign: "center",
        renderCell: ({ row }: { row: CashSessionMovementRow }) => {
          const isSale = row.transactionType === "SALE";
          const canPrint =
            row.transactionType !== "CASH_CHANGE" &&
            canReprintPosSaleReceipt(row.transactionType);
          if (!isSale && !canPrint) {
            return <span className="text-xs text-muted-foreground">—</span>;
          }
          return (
            <div className="flex items-center justify-center gap-1">
              {canPrint ? (
                <IconButton
                  icon="Printer"
                  variant="action"
                  size="sm"
                  ariaLabel="Reimprimir comprobante"
                  title="Reimprimir comprobante"
                  onClick={() => openReprintPreview(row)}
                  data-test-id={`cash-movements-reprint-${row.id}`}
                />
              ) : null}
              {isSale ? (
                <IconButton
                  icon="MoreHorizontal"
                  variant="action"
                  size="sm"
                  ariaLabel="Ver detalle de la venta"
                  title="Detalle de la venta"
                  onClick={() => openSaleDetail(row)}
                  data-test-id={`cash-movements-sale-detail-${row.id}`}
                />
              ) : null}
            </div>
          );
        },
      },
    ],
    [openReprintPreview, openSaleDetail],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <h1 className="text-xl font-semibold tracking-tight" style={{ color: "var(--color-foreground)" }}>
        Movimientos de caja
      </h1>

      {error ? (
        <Alert variant="warning" data-test-id="cash-movements-error">
          {error}
        </Alert>
      ) : null}

      {printNotice ? (
        <Alert variant="info" data-test-id="cash-movements-print-notice">
          {printNotice}
        </Alert>
      ) : null}

      <CashMovementReprintPreviewDialog
        open={reprintTxId != null}
        transactionId={reprintTxId}
        documentNumber={reprintDocNumber}
        onClose={closeReprintPreview}
        onPrintNotice={setPrintNotice}
      />

      <CashMovementSaleDetailDialog
        open={detailTxId != null}
        transactionId={detailTxId}
        documentNumber={detailDocNumber}
        onClose={closeSaleDetail}
      />

      {loading ? (
        <div className="flex flex-1 items-center justify-center py-16">
          <DotProgress />
        </div>
      ) : (
        <DataGrid
          columns={columns}
          title=""
          rows={gridRows}
          totalRows={gridRows.length}
          height="min(70vh, 640px)"
          showSearch={false}
          showSortButton={false}
          showFilterButton={false}
          showExportButton={false}
          showFooter={false}
          pinActionsColumn
          actionsColumnField="actions"
          data-test-id="cash-movements-grid"
        />
      )}
    </div>
  );
}
