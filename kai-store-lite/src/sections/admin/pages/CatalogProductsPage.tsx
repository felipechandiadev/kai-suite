import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Badge,
  Button,
  CollectionPageLayout,
  Dialog,
  IconButton,
  Select,
  TextField,
} from "@kai/ui";
import { CoreError } from "@/shared/components/AdminTable";
import { LiteDataGrid, slicePage, type DataGridColumn } from "@/shared/components/LiteDataGrid";
import { useCollectionSearchQuery } from "@/shared/hooks/useCollectionSearchQuery";
import { toUserMessage } from "@/lib/errors";
import { formatClp } from "@/lib/format";
import { ADMIN_ROUTES } from "@/config/routes";
import {
  liteAdminApi,
  type LiteProductRow,
  type LiteProductVariantRow,
} from "../api/lite-admin.api";
import { CreateLiteVariantDialog } from "../components/CreateLiteVariantDialog";
import { BulkProductImportDialog } from "../components/BulkProductImportDialog";

const TYPES = [
  { id: "PHYSICAL", label: "Producto físico" },
  { id: "SERVICE", label: "Servicio" },
  { id: "PACK", label: "Pack (kit)" },
  { id: "INSUMO", label: "Insumo" },
];

const TYPE_LABEL: Record<string, string> = Object.fromEntries(
  TYPES.map((t) => [t.id, t.label]),
);

function VariantExpandSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function LiteProductExpandPanel({
  row,
  onAddVariant,
  onOpenVariant,
}: {
  row: LiteProductRow;
  onAddVariant: (r: LiteProductRow) => void;
  onOpenVariant: (variantId: string) => void;
}) {
  const variants = row.variants ?? [];

  return (
    <div
      className="relative box-border w-full min-w-0 max-w-full overflow-x-hidden"
      data-test-id="lite-products-expand-panel"
    >
      <div className="mb-3 flex w-full min-w-0 flex-wrap items-center gap-2">
        <IconButton
          icon="Plus"
          variant="action"
          size="sm"
          ariaLabel="Agregar variante"
          title="Agregar variante"
          onClick={() => onAddVariant(row)}
          data-test-id="lite-products-expand-add-variant"
        />
        <h3 className="shrink-0 text-sm font-semibold text-foreground">Variantes</h3>
        <span className="text-xs text-muted-foreground">
          {variants.length} {variants.length === 1 ? "variante" : "variantes"}
        </span>
      </div>

      {variants.length > 0 ? (
        <div className="flex w-full min-w-0 flex-col gap-1.5" data-test-id="lite-products-expand-cards">
          {variants.map((v) => (
            <LiteVariantExpandCard
              key={v.variantId}
              v={v}
              onOpen={() => onOpenVariant(v.variantId)}
            />
          ))}
        </div>
      ) : (
        <p className="px-1 py-4 text-center text-sm text-muted-foreground">
          Sin variantes. Usá el botón + para crear la primera.
        </p>
      )}
    </div>
  );
}

function LiteVariantExpandCard({
  v,
  onOpen,
}: {
  v: LiteProductVariantRow;
  onOpen: () => void;
}) {
  const barcode = v.barcode?.trim() ?? "";
  const attrs = v.attributesLabel?.trim();

  return (
    <div
      className="flex min-w-0 max-w-full cursor-pointer items-start justify-between gap-2 overflow-hidden rounded-md border border-border bg-muted/15 px-2 py-1.5 transition-colors hover:bg-muted/30"
      data-test-id={`lite-products-expand-variant-${v.variantId}`}
      role="button"
      tabIndex={0}
      aria-label={`Ver variante ${v.sku}`}
      title="Ver ficha de variante"
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <div className="grid min-w-0 flex-1 grid-cols-[repeat(auto-fit,minmax(min(100%,8.5rem),1fr))] gap-3">
        <VariantExpandSection title="SKU / código">
          <div className="flex flex-col gap-0 leading-tight">
            <span className="text-[10px] text-muted-foreground">
              SKU:{" "}
              <span className="font-mono font-medium text-foreground">{v.sku}</span>
            </span>
            <span className="text-[10px] text-muted-foreground">
              Código:{" "}
              <span className="font-mono font-medium text-foreground">
                {barcode || "—"}
              </span>
            </span>
          </div>
        </VariantExpandSection>

        <VariantExpandSection title="Atributos">
          {attrs ? (
            <span title={attrs}>
              <Badge
                variant="primary-outlined"
                className="max-w-full truncate text-[10px] font-medium"
              >
                {attrs}
              </Badge>
            </span>
          ) : (
            <span className="text-[10px] text-muted-foreground">—</span>
          )}
        </VariantExpandSection>

        <VariantExpandSection title="Precio">
          <span className="text-sm font-medium tabular-nums text-foreground">
            {formatClp(v.basePrice)}
          </span>
        </VariantExpandSection>

        <VariantExpandSection title="Estado">
          <Badge variant={v.isActive ? "success" : "secondary-outlined"}>
            {v.isActive ? "Activa" : "Inactiva"}
          </Badge>
          {v.physicalStock != null ? (
            <span className="ml-2 text-[10px] text-muted-foreground">
              Stock: {v.physicalStock}
            </span>
          ) : null}
        </VariantExpandSection>
      </div>
      <IconButton
        icon="ChevronRight"
        variant="action"
        size="sm"
        ariaLabel="Abrir variante"
        onClick={(e) => {
          e.stopPropagation();
          onOpen();
        }}
      />
    </div>
  );
}

export function CatalogProductsPage() {
  const navigate = useNavigate();
  const q = useCollectionSearchQuery();
  const [items, setItems] = useState<LiteProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [productType, setProductType] = useState("PHYSICAL");
  const [basePrice, setBasePrice] = useState("0");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [addVariantFor, setAddVariantFor] = useState<LiteProductRow | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    void liteAdminApi
      .products()
      .then((r) => setItems(r.items ?? []))
      .catch((e) => setError(toUserMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const filtered = useMemo(() => {
    if (!q) return items;
    const ql = q.toLowerCase();
    return items.filter((r) => {
      const variantHay = (r.variants ?? [])
        .map((v) => `${v.sku} ${v.barcode ?? ""} ${v.attributesLabel ?? ""}`)
        .join(" ");
      const hay = `${r.name} ${r.productType} ${variantHay}`.toLowerCase();
      return hay.includes(ql);
    });
  }, [items, q]);

  const rows = useMemo(
    () =>
      filtered.map((r) => ({
        ...r,
        id: r.id || r.productId,
      })),
    [filtered],
  );

  const columns: DataGridColumn[] = useMemo(
    () => [
      {
        field: "name",
        headerName: "Nombre",
        flex: 1.2,
        minWidth: 180,
        sortable: false,
      },
      {
        field: "productType",
        headerName: "Tipo",
        flex: 0.6,
        minWidth: 120,
        sortable: false,
        valueGetter: ({ row }) =>
          TYPE_LABEL[(row as LiteProductRow).productType] ??
          (row as LiteProductRow).productType,
      },
      {
        field: "variantCount",
        headerName: "Variantes",
        width: 120,
        minWidth: 100,
        align: "right",
        sortable: false,
      },
      {
        field: "isActive",
        headerName: "Estado",
        width: 120,
        minWidth: 100,
        sortable: false,
        renderCell: ({ row }) => {
          const active = Boolean((row as LiteProductRow).isActive);
          return (
            <Badge variant={active ? "success" : "secondary-outlined"}>
              {active ? "Activo" : "Inactivo"}
            </Badge>
          );
        },
      },
    ],
    [],
  );

  const expandableRowContent = useCallback(
    (row: LiteProductRow) => (
      <LiteProductExpandPanel
        row={row}
        onAddVariant={setAddVariantFor}
        onOpenVariant={(variantId) => navigate(ADMIN_ROUTES.catalogVariant(variantId))}
      />
    ),
    [navigate],
  );

  async function create() {
    setBusy(true);
    setFormError(null);
    try {
      await liteAdminApi.createProduct({
        name,
        productType,
        sku: sku || undefined,
        barcode: barcode.trim() || undefined,
        basePrice: Number(basePrice) || 0,
      });
      setOpen(false);
      setName("");
      setSku("");
      setBarcode("");
      setBasePrice("0");
      reload();
    } catch (e) {
      setFormError(toUserMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <CollectionPageLayout
      title="Catálogo"
      showSearch
      addAction={
        <div className="flex items-center gap-1">
          <IconButton
            icon="Upload"
            variant="action"
            size="sm"
            ariaLabel="Importar productos CSV"
            title="Importar CSV"
            onClick={() => setBulkOpen(true)}
            data-test-id="catalog-bulk-import"
          />
          <IconButton
            icon="Plus"
            variant="action"
            size="sm"
            ariaLabel="Crear producto"
            title="Crear producto"
            onClick={() => setOpen(true)}
            data-test-id="catalog-create-product"
          />
        </div>
      }
      data-test-id="catalog-products-page"
    >
      <CoreError message={error} />
      <LiteDataGrid
        columns={columns}
        rows={slicePage(rows, page, limit)}
        loading={loading}
        totalRows={rows.length}
        totalGeneral={rows.length}
        page={page}
        limit={limit}
        onPaginationChange={(next) => {
          setPage(next.page);
          setLimit(next.limit);
        }}
        expandable
        expandableRowContent={(row) =>
          expandableRowContent(row as LiteProductRow)
        }
        data-test-id="catalog-products-data-grid"
      />

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Crear producto"
        actions={
          <>
            <Button type="button" variant="outlined" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" loading={busy} onClick={() => void create()}>
              Crear
            </Button>
          </>
        }
        alertArea={formError ? <Alert variant="error">{formError}</Alert> : undefined}
      >
        <div className="flex flex-col gap-3">
          <TextField label="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
          <Select
            label="Tipo"
            options={TYPES}
            value={productType}
            onChange={(id) => setProductType(String(id))}
            alwaysShowLabel
          />
          <TextField label="SKU" value={sku} onChange={(e) => setSku(e.target.value)} />
          <TextField
            label="Código de barras"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            data-test-id="create-product-barcode"
          />
          <TextField
            label="Precio base"
            value={basePrice}
            onChange={(e) => setBasePrice(e.target.value)}
            type="currency"
            currencySymbol="$"
          />
        </div>
      </Dialog>

      {addVariantFor ? (
        <CreateLiteVariantDialog
          open
          onClose={() => setAddVariantFor(null)}
          productId={addVariantFor.productId}
          productName={addVariantFor.name}
          productType={addVariantFor.productType}
          onSuccess={async () => {
            reload();
          }}
        />
      ) : null}

      <BulkProductImportDialog
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        onDone={() => reload()}
      />
    </CollectionPageLayout>
  );
}
