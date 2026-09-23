import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  AutoComplete,
  Badge,
  Button,
  IconButton,
  NumberStepper,
  Select,
  Switch,
  TextField,
} from "@kai/ui";
import { CoreError, LoadingLine } from "@/shared/components/AdminTable";
import { toUserMessage } from "@/lib/errors";
import { formatClp } from "@/lib/format";
import { ADMIN_ROUTES } from "@/config/routes";
import {
  liteAdminApi,
  flattenLiteProductVariants,
  type LiteAttributeRow,
  type LiteFlatVariantOption,
  type LitePackLine,
  type LiteSiblingVariant,
  type LiteVariantDetail,
} from "../api/lite-admin.api";
import { LiteVariantPriceCalculatorDialog } from "../components/LiteVariantPriceCalculatorDialog";

type SectionId = "identidad" | "precios" | "inventario" | "pack";

const BASE_TABS: { id: SectionId; label: string }[] = [
  { id: "identidad", label: "Identidad" },
  { id: "precios", label: "Precio" },
  { id: "inventario", label: "Inventario" },
  { id: "pack", label: "Pack" },
];

const TYPE_LABEL: Record<string, string> = {
  PHYSICAL: "Producto físico",
  SERVICE: "Servicio",
  PACK: "Pack (kit)",
  INSUMO: "Insumo",
};

export function CatalogVariantDetailPage() {
  const navigate = useNavigate();
  const { variantId = "" } = useParams();
  const [detail, setDetail] = useState<LiteVariantDetail | null>(null);
  const [section, setSection] = useState<SectionId>("identidad");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [editingIdentity, setEditingIdentity] = useState(false);
  const [editingPrice, setEditingPrice] = useState(false);
  const [editingPack, setEditingPack] = useState(false);

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [basePrice, setBasePrice] = useState("0");
  const [packLines, setPackLines] = useState<LitePackLine[]>([]);
  const [catalog, setCatalog] = useState<LiteFlatVariantOption[]>([]);
  const [packSearchQuery, setPackSearchQuery] = useState("");
  const [packPick, setPackPick] = useState<{
    id: string;
    label: string;
    name: string;
    sku: string;
  } | null>(null);

  const [attributes, setAttributes] = useState<LiteAttributeRow[]>([]);
  const [attrSelections, setAttrSelections] = useState<Record<string, string>>({});
  const [siblings, setSiblings] = useState<LiteSiblingVariant[]>([]);
  const [priceCalcOpen, setPriceCalcOpen] = useState(false);

  const tabs = useMemo(() => {
    if (detail?.productType === "PACK") return BASE_TABS;
    return BASE_TABS.filter((t) => t.id !== "pack");
  }, [detail?.productType]);

  const syncIdentityFromDetail = useCallback((d: LiteVariantDetail, attrs: LiteAttributeRow[]) => {
    setName(d.name);
    setSku(d.sku);
    setBarcode(d.barcode ?? "");
    setIsActive(Boolean(d.isActive));
    const sel: Record<string, string> = {};
    for (const a of attrs) {
      sel[a.id] = d.attributeValues?.[a.id] ?? "";
    }
    setAttrSelections(sel);
  }, []);

  const reload = useCallback(() => {
    if (!variantId) return;
    setLoading(true);
    setError(null);
    void Promise.all([
      liteAdminApi.variantDetail(variantId),
      liteAdminApi.getPack(variantId).catch(() => ({ lines: [] as LitePackLine[] })),
      liteAdminApi.products().catch(() => ({ items: [] })),
      liteAdminApi.attributes().catch(() => ({ items: [] as LiteAttributeRow[] })),
    ])
      .then(async ([d, pack, products, attrsRes]) => {
        setDetail(d);
        setBasePrice(String(d.basePrice ?? 0));
        setPackLines(pack.lines ?? []);
        setCatalog(flattenLiteProductVariants(products.items ?? []));
        const activeAttrs = (attrsRes.items ?? []).filter((a) => a.isActive);
        setAttributes(activeAttrs);
        syncIdentityFromDetail(d, activeAttrs);
        try {
          const sib = await liteAdminApi.productVariants(d.productId);
          setSiblings(sib.items ?? []);
        } catch {
          setSiblings([]);
        }
      })
      .catch((e) => setError(toUserMessage(e)))
      .finally(() => setLoading(false));
  }, [variantId, syncIdentityFromDetail]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (!tabs.some((t) => t.id === section)) setSection("identidad");
  }, [tabs, section]);

  useEffect(() => {
    setEditingIdentity(false);
    setEditingPrice(false);
    setEditingPack(false);
    setMsg(null);
  }, [section, variantId]);

  async function saveIdentity() {
    if (!detail) return;
    setBusy(true);
    setMsg(null);
    try {
      const attributeValues: Record<string, string> = {};
      for (const [id, val] of Object.entries(attrSelections)) {
        const trimmed = val.trim();
        if (trimmed) attributeValues[id] = trimmed;
      }
      await liteAdminApi.patchProduct(detail.productId, { name });
      await liteAdminApi.patchVariant(detail.variantId, {
        sku,
        barcode: barcode || null,
        isActive,
        attributeValues:
          Object.keys(attributeValues).length > 0 ? attributeValues : null,
      });
      setMsg("Identidad guardada");
      setEditingIdentity(false);
      reload();
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function savePrice() {
    if (!detail) return;
    setBusy(true);
    setMsg(null);
    try {
      await liteAdminApi.patchVariant(detail.variantId, {
        basePrice: Number(basePrice) || 0,
      });
      setMsg("Precio guardado");
      setEditingPrice(false);
      reload();
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function savePack() {
    if (!detail) return;
    setBusy(true);
    setMsg(null);
    try {
      await liteAdminApi.putPack(detail.variantId, packLines);
      setMsg("Pack guardado");
      setEditingPack(false);
      reload();
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setBusy(false);
    }
  }

  function toggleIdentityEditOrSave() {
    setMsg(null);
    setError(null);
    if (editingIdentity) {
      void saveIdentity();
      return;
    }
    if (detail) syncIdentityFromDetail(detail, attributes);
    setEditingIdentity(true);
  }

  function togglePriceEditOrSave() {
    setMsg(null);
    setError(null);
    if (editingPrice) {
      void savePrice();
      return;
    }
    if (detail) setBasePrice(String(detail.basePrice ?? 0));
    setEditingPrice(true);
  }

  function togglePackEditOrSave() {
    setMsg(null);
    setError(null);
    if (editingPack) {
      void savePack();
      return;
    }
    setEditingPack(true);
  }

  const packComponentOptions = useMemo(() => {
    if (!detail) return [];
    const taken = new Set(packLines.map((l) => l.componentVariantId));
    const q = packSearchQuery.trim().toLowerCase();
    return catalog
      .filter(
        (c) =>
          c.variantId !== detail.variantId &&
          !taken.has(c.variantId) &&
          (c.productType === "PHYSICAL" || c.productType === "INSUMO"),
      )
      .filter((c) => {
        if (!q) return true;
        const hay = `${c.name} ${c.sku} ${c.attributesLabel ?? ""}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 30)
      .map((c) => ({
        id: c.variantId,
        label: `${c.name}${c.attributesLabel ? ` · ${c.attributesLabel}` : ""} (${c.sku})`,
        name: c.name,
        sku: c.sku,
      }));
  }, [catalog, detail, packLines, packSearchQuery]);

  function addPackComponent(opt: {
    id: string;
    label: string;
    name: string;
    sku: string;
  } | null) {
    if (!opt || !detail || !editingPack) return;
    if (opt.id === detail.variantId) return;
    setPackLines((prev) => [
      ...prev.filter((x) => x.componentVariantId !== opt.id),
      {
        componentVariantId: opt.id,
        qty: 1,
        name: opt.name,
        sku: opt.sku,
      },
    ]);
    setPackPick(null);
    setPackSearchQuery("");
  }

  function updatePackQty(componentVariantId: string, qty: number) {
    if (!editingPack) return;
    const next = Number.isFinite(qty) && qty > 0 ? Math.round(qty * 1000) / 1000 : 1;
    setPackLines((prev) =>
      prev.map((l) =>
        l.componentVariantId === componentVariantId ? { ...l, qty: next } : l,
      ),
    );
  }

  const attrBadges = useMemo(() => {
    if (!detail?.attributeValues || attributes.length === 0) return [];
    const out: Array<{ key: string; value: string }> = [];
    for (const a of attributes) {
      const val = detail.attributeValues[a.id]?.trim();
      if (val) out.push({ key: a.id, value: val });
    }
    return out;
  }, [attributes, detail]);

  const otherSiblings = siblings.filter((s) => s.variantId !== detail?.variantId);

  return (
    <div
      className="mx-auto w-full max-w-4xl space-y-6 px-1 pb-8"
      data-test-id="catalog-variant-detail"
    >
      <header
        className="border-b border-border pb-4"
        data-test-id="catalog-variant-detail-header"
      >
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-2 sm:gap-x-3">
          <IconButton
            icon="ArrowLeft"
            variant="action"
            size="sm"
            ariaLabel="Volver al catálogo"
            onClick={() => navigate(ADMIN_ROUTES.catalogProducts)}
          />
          <h1
            className="min-w-0 text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
            title={detail?.name ?? "Variante"}
          >
            {detail?.name ?? "Variante"}
          </h1>
          {detail ? (
            <Badge variant={detail.isActive ? "success" : "secondary-outlined"}>
              {detail.isActive ? "Activa" : "Inactiva"}
            </Badge>
          ) : null}
          {attrBadges.length > 0 ? (
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              {attrBadges.map(({ key, value }) => (
                <Badge
                  key={key}
                  variant="primary-outlined"
                  className="max-w-full shrink-0 truncate text-xs font-normal sm:text-sm"
                >
                  {value}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
        {detail ? (
          <>
            <p className="mt-3 font-mono text-sm text-muted-foreground">{detail.sku}</p>
            {detail.barcode?.trim() ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Código de barras: {detail.barcode.trim()}
              </p>
            ) : null}
            <p className="mt-1 text-xs text-muted-foreground">
              Tipo de producto:{" "}
              {TYPE_LABEL[detail.productType] ?? detail.productType}
              {" · "}
              {formatClp(detail.basePrice)}
            </p>
          </>
        ) : null}
      </header>

      <nav
        className="flex flex-wrap border-b border-border"
        role="tablist"
        aria-label="Secciones de variante"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={section === t.id}
            className={[
              "cursor-pointer border-0 border-b-2 bg-transparent px-3 py-2 text-sm transition-colors",
              section === t.id
                ? "-mb-px border-primary font-semibold text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            ].join(" ")}
            onClick={() => setSection(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="min-h-[16rem] space-y-4" data-test-id="catalog-variant-detail-section">
        <LoadingLine loading={loading} />
        <CoreError message={error} />
        {msg ? <Alert variant="success">{msg}</Alert> : null}

        {!loading && detail ? (
          <>
            {section === "identidad" ? (
              <>
                <section
                  className="relative space-y-4 rounded-lg border border-border bg-background p-4 pb-12"
                  data-test-id="catalog-variant-identity-section"
                >
                  <TextField
                    label="Nombre"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    readOnly={!editingIdentity}
                    disabled={busy}
                  />
                  <TextField
                    label="SKU"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    readOnly={!editingIdentity}
                    disabled={busy}
                  />
                  <TextField
                    label="Código de barras"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    readOnly={!editingIdentity}
                    disabled={busy}
                  />
                  <Switch
                    label={isActive ? "Variante activa" : "Variante inactiva"}
                    checked={isActive}
                    onChange={(v) => setIsActive(v)}
                    disabled={!editingIdentity || busy}
                    data-test-id="catalog-variant-active-switch"
                  />
                  {attributes.length > 0 ? (
                    <div className="flex flex-col gap-2 rounded-lg border border-border/70 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Atributos
                      </p>
                      {attributes.map((a) => (
                        <Select
                          key={a.id}
                          label={a.name}
                          options={[
                            { id: "", label: "Sin definir" },
                            ...a.options.map((o) => ({ id: o, label: o })),
                          ]}
                          value={attrSelections[a.id] ?? ""}
                          onChange={(id) =>
                            setAttrSelections((prev) => ({
                              ...prev,
                              [a.id]: String(id),
                            }))
                          }
                          alwaysShowLabel
                          disabled={!editingIdentity || busy}
                        />
                      ))}
                    </div>
                  ) : null}
                  <div className="absolute bottom-2 right-2">
                    <IconButton
                      icon={editingIdentity ? "Save" : "Pencil"}
                      variant="action"
                      size="sm"
                      ariaLabel={
                        editingIdentity ? "Guardar identidad" : "Editar identidad"
                      }
                      title={editingIdentity ? "Guardar" : "Editar"}
                      onClick={toggleIdentityEditOrSave}
                      disabled={busy}
                      isLoading={busy && editingIdentity}
                      data-test-id="catalog-variant-identity-edit-save"
                    />
                  </div>
                </section>

                {otherSiblings.length > 0 ? (
                  <div className="rounded-lg border border-border/70 p-3">
                    <p className="mb-2 text-sm font-semibold text-foreground">
                      Otras variantes
                    </p>
                    <ul className="space-y-1.5 text-sm">
                      {otherSiblings.map((s) => (
                        <li
                          key={s.variantId}
                          className="flex items-center justify-between gap-2"
                        >
                          <span>
                            {s.sku}
                            {s.attributesLabel ? (
                              <span className="text-muted-foreground">
                                {" "}
                                · {s.attributesLabel}
                              </span>
                            ) : null}
                          </span>
                          <Link
                            to={ADMIN_ROUTES.catalogVariant(s.variantId)}
                            className="text-primary underline"
                          >
                            Ver
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </>
            ) : null}

            {section === "precios" ? (
              <section
                className="relative space-y-4 rounded-lg border border-border bg-background p-4 pb-12"
                data-test-id="catalog-variant-pricing-section"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-sm font-semibold text-foreground">
                    Precio de venta
                  </h2>
                  {editingPrice ? (
                    <IconButton
                      icon="Calculator"
                      variant="action"
                      size="sm"
                      ariaLabel="Calculadora de precio"
                      title="Calculadora costo / margen"
                      onClick={() => setPriceCalcOpen(true)}
                      data-test-id="lite-open-price-calculator"
                    />
                  ) : null}
                </div>
                <TextField
                  label="Precio"
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  type="currency"
                  currencySymbol="$"
                  readOnly={!editingPrice}
                  disabled={busy}
                />
                {detail.baseCost != null && detail.baseCost > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Costo:{" "}
                    <span className="font-medium text-foreground">
                      {formatClp(detail.baseCost)}
                    </span>
                  </p>
                ) : null}
                <div className="absolute bottom-2 right-2">
                  <IconButton
                    icon={editingPrice ? "Save" : "Pencil"}
                    variant="action"
                    size="sm"
                    ariaLabel={editingPrice ? "Guardar precio" : "Editar precio"}
                    title={editingPrice ? "Guardar" : "Editar"}
                    onClick={togglePriceEditOrSave}
                    disabled={busy}
                    isLoading={busy && editingPrice}
                    data-test-id="catalog-variant-price-edit-save"
                  />
                </div>
              </section>
            ) : null}

            {section === "inventario" ? (
              <>
                <p className="text-sm">
                  Stock físico: <strong>{detail.physicalStock ?? "—"}</strong>
                </p>
                <Button
                  type="button"
                  variant="outlined"
                  onClick={() => navigate(ADMIN_ROUTES.inventoryStock)}
                >
                  Ir a Existencias
                </Button>
              </>
            ) : null}

            {section === "pack" ? (
              <section
                className="relative space-y-4 rounded-lg border border-border bg-background p-4 pb-12"
                data-test-id="catalog-variant-pack-section"
              >
                <div>
                  <h2 className="text-sm font-semibold text-foreground">
                    Composición del pack
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Buscá variantes físicas o insumos y definí la cantidad por unidad de
                    pack.
                  </p>
                </div>

                {packLines.length > 0 ? (
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full min-w-[480px] border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          <th className="px-3 py-2">Producto</th>
                          <th className="w-36 px-3 py-2">SKU</th>
                          <th className="w-36 px-3 py-2">Cant.</th>
                          {editingPack ? <th className="w-12 px-3 py-2" /> : null}
                        </tr>
                      </thead>
                      <tbody>
                        {packLines.map((l) => (
                          <tr
                            key={l.componentVariantId}
                            className="border-b border-border/70"
                          >
                            <td className="px-3 py-2 font-medium text-foreground">
                              {l.name ?? l.sku ?? l.componentVariantId}
                            </td>
                            <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                              {l.sku ?? "—"}
                            </td>
                            <td className="px-3 py-2">
                              {editingPack ? (
                                <NumberStepper
                                  value={l.qty}
                                  onChange={(v) =>
                                    updatePackQty(l.componentVariantId, v)
                                  }
                                  min={0.001}
                                  step={1}
                                  allowFloat
                                  allowNegative={false}
                                  data-test-id={`pack-qty-${l.componentVariantId}`}
                                />
                              ) : (
                                <span className="tabular-nums">{l.qty}</span>
                              )}
                            </td>
                            {editingPack ? (
                              <td className="px-3 py-2">
                                <IconButton
                                  icon="Trash2"
                                  variant="ghost"
                                  size="sm"
                                  ariaLabel="Quitar componente"
                                  onClick={() =>
                                    setPackLines((prev) =>
                                      prev.filter(
                                        (x) =>
                                          x.componentVariantId !==
                                          l.componentVariantId,
                                      ),
                                    )
                                  }
                                />
                              </td>
                            ) : null}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {editingPack
                      ? "Todavía no hay componentes. Buscá una variante abajo para agregar."
                      : "Sin componentes en el pack."}
                  </p>
                )}

                {editingPack ? (
                  <AutoComplete<{
                    id: string;
                    label: string;
                    name: string;
                    sku: string;
                  }>
                    label="Agregar componente"
                    alwaysShowLabel
                    options={packComponentOptions}
                    value={packPick}
                    onChange={(opt) => addPackComponent(opt)}
                    onInputChange={setPackSearchQuery}
                    getOptionLabel={(o) => o.label}
                    getOptionValue={(o) => o.id}
                    data-test-id="pack-component-autocomplete"
                  />
                ) : null}

                <div className="absolute bottom-2 right-2">
                  <IconButton
                    icon={editingPack ? "Save" : "Pencil"}
                    variant="action"
                    size="sm"
                    ariaLabel={editingPack ? "Guardar pack" : "Editar pack"}
                    title={editingPack ? "Guardar" : "Editar"}
                    onClick={togglePackEditOrSave}
                    disabled={busy}
                    isLoading={busy && editingPack}
                    data-test-id="catalog-variant-pack-edit-save"
                  />
                </div>
              </section>
            ) : null}
          </>
        ) : null}
      </div>

      {detail ? (
        <LiteVariantPriceCalculatorDialog
          open={priceCalcOpen}
          onClose={() => setPriceCalcOpen(false)}
          initialCost={Number(detail.baseCost ?? 0)}
          onApply={({ cost, salePrice }) => {
            setBasePrice(String(salePrice));
            setBusy(true);
            setMsg(null);
            void liteAdminApi
              .patchVariant(detail.variantId, {
                basePrice: salePrice,
                baseCost: cost,
              })
              .then(() => {
                setMsg("Precio aplicado desde calculadora");
                setEditingPrice(false);
                reload();
              })
              .catch((e) => setError(toUserMessage(e)))
              .finally(() => setBusy(false));
          }}
        />
      ) : null}
    </div>
  );
}
