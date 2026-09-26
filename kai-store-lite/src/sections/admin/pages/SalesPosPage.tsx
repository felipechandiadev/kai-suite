import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Badge, Button, IconButton, Select, Switch } from "@kai/ui";
import { CoreError, LoadingLine } from "@/shared/components/AdminTable";
import { toUserMessage } from "@/lib/errors";
import {
  liteAdminApi,
  type LitePosCurrent,
  type LiteStorageRow,
} from "../api/lite-admin.api";

type SectionId = "general" | "medios-pago";

const TABS: { id: SectionId; label: string }[] = [
  { id: "general", label: "General" },
  { id: "medios-pago", label: "Medios de pago" },
];

const PAYMENT_LABELS: Record<string, string> = {
  CASH: "Efectivo",
  CREDIT_CARD: "Tarjeta de crédito",
  DEBIT_CARD: "Tarjeta de débito",
  TRANSFER: "Transferencia",
};

const DEFAULT_AVAILABLE = ["CASH", "CREDIT_CARD", "DEBIT_CARD", "TRANSFER"];
const DEFAULT_ENABLED = ["CASH", "CREDIT_CARD", "DEBIT_CARD", "TRANSFER"];

function withoutCheque(methods: string[] | undefined, fallback: string[]): string[] {
  const src = methods?.length ? methods : fallback;
  return src.filter((m) => m !== "CHECK");
}

export function SalesPosPage() {
  const [pos, setPos] = useState<LitePosCurrent | null>(null);
  const [storages, setStorages] = useState<LiteStorageRow[]>([]);
  const [section, setSection] = useState<SectionId>("general");
  const [storageId, setStorageId] = useState("");
  const [editingStorage, setEditingStorage] = useState(false);
  const [showProductSearch, setShowProductSearch] = useState(true);
  const [enabledMethods, setEnabledMethods] = useState<string[]>(DEFAULT_ENABLED);
  const [availableMethods, setAvailableMethods] = useState<string[]>(DEFAULT_AVAILABLE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const storageName = useMemo(() => {
    if (!storageId) return null;
    return storages.find((s) => s.id === storageId)?.name ?? null;
  }, [storageId, storages]);

  const reload = useCallback(() => {
    setLoading(true);
    void Promise.all([liteAdminApi.posCurrent(), liteAdminApi.storages()])
      .then(([p, s]) => {
        setPos(p);
        setStorageId(p.storageId ?? "");
        setStorages(s.items ?? []);
        setShowProductSearch(p.showProductSearch !== false);
        setEnabledMethods(withoutCheque(p.enabledPaymentMethods, DEFAULT_ENABLED));
        setAvailableMethods(
          withoutCheque(p.availablePaymentMethods, DEFAULT_AVAILABLE),
        );
      })
      .catch((e) => setError(toUserMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  function toggleMethod(method: string, on: boolean) {
    setEnabledMethods((prev) => {
      if (on) {
        if (prev.includes(method)) return prev;
        return availableMethods.filter((m) => m === method || prev.includes(m));
      }
      const next = prev.filter((m) => m !== method);
      return next.length > 0 ? next : prev;
    });
  }

  async function saveStorage() {
    setBusy(true);
    setMsg(null);
    setError(null);
    try {
      await liteAdminApi.patchPosCurrent({
        storageId: storageId || null,
      });
      setMsg("Almacén actualizado");
      setEditingStorage(false);
      reload();
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setBusy(false);
    }
  }

  function toggleEditStorageOrSave() {
    setMsg(null);
    setError(null);
    if (editingStorage) {
      void saveStorage();
      return;
    }
    setStorageId(pos?.storageId ?? "");
    setEditingStorage(true);
  }

  async function saveShowProductSearch(next: boolean) {
    setShowProductSearch(next);
    setBusy(true);
    setMsg(null);
    setError(null);
    try {
      await liteAdminApi.patchPosCurrent({ showProductSearch: next });
      setMsg(next ? "Buscador de productos visible en caja" : "Caja solo con carrito");
      reload();
    } catch (e) {
      setShowProductSearch(!next);
      setError(toUserMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function savePaymentMethods() {
    const methods = withoutCheque(enabledMethods, DEFAULT_ENABLED);
    if (methods.length === 0) {
      setError("Debés habilitar al menos un medio de pago");
      return;
    }
    setBusy(true);
    setMsg(null);
    setError(null);
    try {
      await liteAdminApi.patchPosCurrent({
        enabledPaymentMethods: methods,
      });
      setMsg("Medios de pago actualizados");
      reload();
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="mx-auto w-full max-w-4xl space-y-6 px-1 pb-8"
      data-test-id="sales-pos-page"
    >
      <header className="border-b border-border pb-4" data-test-id="sales-pos-header">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-2 sm:gap-x-3">
          <h1 className="min-w-0 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {pos?.name?.trim() || "Punto de venta"}
          </h1>
          {pos ? (
            <Badge variant={pos.isActive === false ? "secondary-outlined" : "success"}>
              {pos.isActive === false ? "Inactivo" : "Activo"}
            </Badge>
          ) : null}
        </div>
        {storageName && !editingStorage ? (
          <p className="mt-2 text-sm text-muted-foreground">Sala de venta: {storageName}</p>
        ) : null}
      </header>

      <nav
        className="flex flex-wrap border-b border-border"
        role="tablist"
        aria-label="Secciones del punto de venta"
      >
        {TABS.map((t) => (
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
            onClick={() => {
              setMsg(null);
              setEditingStorage(false);
              setSection(t.id);
            }}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="min-h-64 space-y-4" data-test-id="sales-pos-section">
        <LoadingLine loading={loading} />
        <CoreError message={error} />
        {msg ? <Alert variant="success">{msg}</Alert> : null}

        {!loading && pos ? (
          <>
            {section === "general" ? (
              <div
                className="relative space-y-4 rounded-lg border border-border bg-background p-4 pb-14"
                data-test-id="sales-pos-general"
              >
                <h2 className="text-sm font-semibold text-foreground">Información general</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border border-border/70 px-3 py-2.5">
                    <p className="text-xs text-muted-foreground">Nombre</p>
                    <p className="mt-0.5 text-sm font-medium text-foreground">
                      {pos.name?.trim() || "—"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/70 px-3 py-2.5">
                    <p className="text-xs text-muted-foreground">Estado</p>
                    <p className="mt-0.5 text-sm font-medium text-foreground">
                      {pos.isActive === false ? "Inactivo" : "Activo"}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    {editingStorage ? (
                      <Select
                        label="Almacén de stock"
                        options={[
                          { id: "", label: "— Sin almacén —" },
                          ...storages.map((s) => ({ id: s.id, label: s.name })),
                        ]}
                        value={storageId}
                        onChange={(id) => setStorageId(String(id))}
                        alwaysShowLabel
                        disabled={busy}
                      />
                    ) : (
                      <div className="rounded-lg border border-border/70 px-3 py-2.5">
                        <p className="text-xs text-muted-foreground">Almacén de stock</p>
                        <p className="mt-0.5 text-sm font-medium text-foreground">
                          {storageName ?? "—"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <Switch
                  checked={showProductSearch}
                  disabled={busy}
                  onChange={(on) => void saveShowProductSearch(on)}
                  label="Mostrar buscador de productos"
                  labelPosition="right"
                  data-test-id="pos-show-product-search"
                />
                <p className="text-xs text-muted-foreground">
                  Si está apagado, la venta muestra solo el carrito. Los productos se cargan con
                  producto especial.
                </p>
                <div className="absolute bottom-2 right-2">
                  <IconButton
                    icon={editingStorage ? "Save" : "Pencil"}
                    variant="action"
                    size="sm"
                    ariaLabel={
                      editingStorage ? "Guardar almacén" : "Editar almacén"
                    }
                    title={editingStorage ? "Guardar" : "Editar almacén"}
                    onClick={toggleEditStorageOrSave}
                    disabled={busy}
                    isLoading={busy}
                    data-test-id="pos-storage-edit-save"
                  />
                </div>
              </div>
            ) : null}

            {section === "medios-pago" ? (
              <div className="space-y-4" data-test-id="sales-pos-payment-methods">
                <p className="text-sm text-muted-foreground">
                  Elegí qué medios de pago estarán disponibles al cobrar en caja.
                </p>
                <ul className="space-y-2">
                  {availableMethods.map((method) => {
                    const checked = enabledMethods.includes(method);
                    const onlyOne = checked && enabledMethods.length === 1;
                    return (
                      <li
                        key={method}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border/70 px-3 py-2.5"
                      >
                        <span className="text-sm font-medium text-foreground">
                          {PAYMENT_LABELS[method] ?? method}
                        </span>
                        <Switch
                          checked={checked}
                          disabled={busy || onlyOne}
                          onChange={(on) => toggleMethod(method, on)}
                          label={checked ? "Activo" : "Inactivo"}
                          labelPosition="left"
                          density="compact"
                          data-test-id={`pos-payment-${method}`}
                        />
                      </li>
                    );
                  })}
                </ul>
                <Button
                  type="button"
                  loading={busy}
                  onClick={() => void savePaymentMethods()}
                >
                  Guardar
                </Button>
              </div>
            ) : null}
          </>
        ) : null}

        {!loading && !pos && !error ? (
          <p className="text-sm text-muted-foreground">
            No hay POS. Ejecutá seed desde Acerca de.
          </p>
        ) : null}
      </div>
    </div>
  );
}
