"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { GripVertical } from "lucide-react";
import { Switch } from "@kai/ui";
import { SelectDefault as Select } from "@kai/ui";
import type { CompanyPaymentMethodConfig } from "@/features/companies/types/company-payment-methods.types";
import {
  COMPANY_PAYMENT_METHOD_LABELS,
  companyPaymentMethodAlwaysRequiresReference,
  POS_CONFIGURABLE_METHOD_IDS,
} from "@/features/companies/types/company-payment-methods.types";
import type { PosPaymentMethodConfig } from "@/features/sales-points-of-sale/types/pos-payment-methods.types";

export type PosPaymentMethodsCardsEditorHandle = {
  getPayload: () => PosPaymentMethodConfig[];
};

type Props = {
  /** Catálogo de empresa (sin filtrar). */
  catalog: CompanyPaymentMethodConfig[];
  /** Lista actual del POS (puede venir vacía). */
  value: PosPaymentMethodConfig[];
  /** Callback con el payload completo a persistir. */
  onChange: (next: PosPaymentMethodConfig[]) => void;
  bankAccountOptions?: Array<{ id: string; label: string }>;
  disabled?: boolean;
  "data-test-id"?: string;
};

function defaultRowForNewCatalogEntry(c: CompanyPaymentMethodConfig): PosPaymentMethodConfig {
  return {
    companyPaymentMethodId: c.id,
    isEnabled: false,
    preloadOnPaymentScreen: false,
    preloadOrder: null,
    isDefaultForChange: false,
    bankAccountKey: c.bankAccountKey ?? null,
    requireReference: companyPaymentMethodAlwaysRequiresReference(c.method) ? true : null,
  };
}

function buildPayloadFromState(
  order: string[],
  byId: Record<string, PosPaymentMethodConfig>,
  usableCatalog: CompanyPaymentMethodConfig[],
): PosPaymentMethodConfig[] {
  const catalogById = new Map(usableCatalog.map((c) => [c.id, c]));
  return order
    .map((id) => byId[id])
    .filter((r): r is PosPaymentMethodConfig => r != null)
    .map((r) => {
      const cmp = catalogById.get(r.companyPaymentMethodId);
      const refLocked =
        cmp != null && companyPaymentMethodAlwaysRequiresReference(cmp.method);
      return {
        companyPaymentMethodId: r.companyPaymentMethodId,
        isEnabled: r.isEnabled === true,
        preloadOnPaymentScreen: r.preloadOnPaymentScreen === true,
        preloadOrder: r.preloadOrder ?? 0,
        isDefaultForChange: r.isDefaultForChange === true,
        bankAccountKey: r.bankAccountKey ?? null,
        requireReference: refLocked
          ? null
          : r.requireReference == null
            ? null
            : r.requireReference === true,
      };
    });
}

function buildInitialById(
  usableCatalog: CompanyPaymentMethodConfig[],
  initial: PosPaymentMethodConfig[],
): Record<string, PosPaymentMethodConfig> {
  const map = new Map<string, PosPaymentMethodConfig>();
  for (const row of initial) {
    map.set(row.companyPaymentMethodId, row);
  }
  const out: Record<string, PosPaymentMethodConfig> = {};
  for (const c of usableCatalog) {
    out[c.id] = map.get(c.id) ?? defaultRowForNewCatalogEntry(c);
  }
  return out;
}

function computeGlobalOrder(
  order: string[],
  byId: Record<string, PosPaymentMethodConfig>,
): Record<string, PosPaymentMethodConfig> {
  const next: Record<string, PosPaymentMethodConfig> = { ...byId };
  for (let i = 0; i < order.length; i += 1) {
    const id = order[i];
    const row = next[id];
    if (!row) continue;
    next[id] = { ...row, preloadOrder: i };
  }
  return next;
}

export const PosPaymentMethodsCardsEditor = forwardRef<
  PosPaymentMethodsCardsEditorHandle,
  Props
>(function PosPaymentMethodsCardsEditor(
  {
    catalog,
    value,
    onChange,
    bankAccountOptions = [],
    disabled = false,
    "data-test-id": dataTestId,
  },
  ref,
) {
  const usableCatalog = useMemo(() => {
    return (catalog ?? [])
      .filter((c) => c.isActive && (POS_CONFIGURABLE_METHOD_IDS as string[]).includes(c.method))
      .slice()
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }, [catalog]);

  const [order, setOrder] = useState<string[]>([]);
  const [byId, setById] = useState<Record<string, PosPaymentMethodConfig>>({});
  const orderRef = useRef(order);
  const byIdRef = useRef(byId);
  const usableCatalogRef = useRef(usableCatalog);
  /** Payload listo para persistir; se actualiza en el mismo tick que el estado local. */
  const latestPayloadRef = useRef<PosPaymentMethodConfig[]>([]);
  orderRef.current = order;
  byIdRef.current = byId;
  usableCatalogRef.current = usableCatalog;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const syncPayloadRef = useCallback(
    (nextOrder: string[], nextById: Record<string, PosPaymentMethodConfig>) => {
      orderRef.current = nextOrder;
      byIdRef.current = nextById;
      latestPayloadRef.current = buildPayloadFromState(
        nextOrder,
        nextById,
        usableCatalogRef.current,
      );
    },
    [],
  );
  /** Evita notificar al padre mientras el editor se hidrata desde `value`. */
  const skipParentSyncRef = useRef(true);
  const hydratedKeyRef = useRef<string | null>(null);

  useImperativeHandle(
    ref,
    () => ({
      getPayload: () => latestPayloadRef.current,
    }),
    [],
  );

  const usableKey = useMemo(() => usableCatalog.map((c) => c.id).join("|"), [usableCatalog]);
  const valueKey = useMemo(() => {
    const rows = (value ?? [])
      .slice()
      .sort((a, b) => a.companyPaymentMethodId.localeCompare(b.companyPaymentMethodId))
      .map((r) => {
        const rr = r.requireReference == null ? "n" : r.requireReference ? "t" : "f";
        return [
          r.companyPaymentMethodId,
          r.isEnabled ? "1" : "0",
          r.preloadOnPaymentScreen ? "1" : "0",
          r.preloadOrder == null ? "x" : String(r.preloadOrder),
          r.isDefaultForChange ? "1" : "0",
          r.bankAccountKey == null ? "x" : String(r.bankAccountKey),
          rr,
        ].join(",");
      });
    return rows.join("|");
  }, [value]);

  const scheduleNotifyParent = useCallback(() => {
    queueMicrotask(() => {
      if (skipParentSyncRef.current) {
        return;
      }
      onChangeRef.current(
        buildPayloadFromState(orderRef.current, byIdRef.current, usableCatalog),
      );
    });
  }, [usableCatalog]);

  useEffect(() => {
    const hydrationKey = `${usableKey}|${valueKey}`;
    if (hydratedKeyRef.current === hydrationKey) {
      return;
    }
    hydratedKeyRef.current = hydrationKey;

    skipParentSyncRef.current = true;
    const nextById = buildInitialById(usableCatalog, value ?? []);
    const initialOrder = usableCatalog
      .slice()
      .sort((a, b) => {
        const ao = nextById[a.id]?.preloadOrder;
        const bo = nextById[b.id]?.preloadOrder;
        const aN = typeof ao === "number" && Number.isFinite(ao) ? ao : 999;
        const bN = typeof bo === "number" && Number.isFinite(bo) ? bo : 999;
        if (aN !== bN) return aN - bN;
        return a.displayOrder - b.displayOrder;
      })
      .map((c) => c.id);

    const orderedById = computeGlobalOrder(initialOrder, nextById);
    syncPayloadRef(initialOrder, orderedById);
    setOrder(initialOrder);
    setById(orderedById);

    queueMicrotask(() => {
      skipParentSyncRef.current = false;
    });
  }, [usableKey, valueKey, value, usableCatalog, syncPayloadRef]);

  const patchRow = useCallback(
    (id: string, patch: Partial<PosPaymentMethodConfig>) => {
      setById((prev) => {
        const isDisabling = patch.isEnabled === false;
        const nextRow: PosPaymentMethodConfig = {
          ...prev[id],
          ...patch,
          ...(isDisabling ? { isDefaultForChange: false } : null),
        } as PosPaymentMethodConfig;
        const nextById = computeGlobalOrder(orderRef.current, { ...prev, [id]: nextRow });
        syncPayloadRef(orderRef.current, nextById);
        return nextById;
      });
      scheduleNotifyParent();
    },
    [scheduleNotifyParent, syncPayloadRef],
  );

  const setUniqueDefault = useCallback(
    (id: string, isDefault: boolean) => {
      const cmp = usableCatalog.find((x) => x.id === id);
      if (!cmp || cmp.method !== "CASH") {
        return;
      }
      setById((prev) => {
        const next: Record<string, PosPaymentMethodConfig> = { ...prev };
        for (const k of Object.keys(next)) {
          next[k] = { ...next[k], isDefaultForChange: false };
        }
        next[id] = { ...next[id], isDefaultForChange: isDefault };
        const nextById = computeGlobalOrder(orderRef.current, next);
        syncPayloadRef(orderRef.current, nextById);
        return nextById;
      });
      scheduleNotifyParent();
    },
    [usableCatalog, scheduleNotifyParent, syncPayloadRef],
  );

  const dragIdRef = useRef<string | null>(null);

  const onDragStart = (id: string) => {
    dragIdRef.current = id;
  };

  const onDrop = (overId: string) => {
    const activeId = dragIdRef.current;
    dragIdRef.current = null;
    if (!activeId || activeId === overId) return;
    setOrder((prevOrder) => {
      const from = prevOrder.indexOf(activeId);
      const to = prevOrder.indexOf(overId);
      if (from < 0 || to < 0) return prevOrder;
      const nextOrder = prevOrder.slice();
      nextOrder.splice(from, 1);
      nextOrder.splice(to, 0, activeId);
      setById((current) => {
        const nextById = computeGlobalOrder(nextOrder, current);
        syncPayloadRef(nextOrder, nextById);
        return nextById;
      });
      scheduleNotifyParent();
      return nextOrder;
    });
  };

  if (usableCatalog.length === 0) {
    return (
      <p className="text-sm text-muted-foreground" data-test-id={dataTestId}>
        La empresa aún no tiene medios de pago aptos para POS. Defínelos en Ajustes → Empresa → Medios de pago.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3" data-test-id={dataTestId}>
      {order.map((id) => {
        const c = usableCatalog.find((x) => x.id === id);
        if (!c) return null;
        const r = byId[id];
        const label = c.alias?.trim() || COMPANY_PAYMENT_METHOD_LABELS[c.method];
        const subtitle = `${COMPANY_PAYMENT_METHOD_LABELS[c.method]}${c.bankAccountKey ? ` · ${c.bankAccountKey}` : ""}`;

        return (
          <div
            key={c.id}
            className="rounded-xl border border-border bg-background p-3 shadow-sm"
            draggable={!disabled}
            onDragStart={() => onDragStart(c.id)}
            onDragOver={(e) => {
              if (disabled) return;
              e.preventDefault();
            }}
            onDrop={() => onDrop(c.id)}
            data-test-id={`pos-payment-method-card-${c.id}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="min-w-0 truncate">{label}</span>
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
              </div>
              {r?.preloadOnPaymentScreen ? (
                <span className="shrink-0 rounded-md border border-secondary/40 bg-secondary/10 px-2 py-1 text-[11px] font-semibold text-secondary">
                  Orden {r.preloadOrder ?? 0}
                </span>
              ) : null}
            </div>

            <div className="mt-3 grid gap-2 md:grid-cols-2 lg:grid-cols-4">
              <Switch
                checked={r?.isEnabled === true}
                onChange={(v) => patchRow(c.id, { isEnabled: v })}
                label="Habilitado"
                labelPosition="right"
                disabled={disabled}
                data-test-id={`pos-pm-enabled-${c.id}`}
              />
              <Switch
                checked={r?.preloadOnPaymentScreen === true}
                onChange={(v) =>
                  patchRow(c.id, {
                    preloadOnPaymentScreen: v,
                  })
                }
                label="Precargar"
                labelPosition="right"
                disabled={disabled || r?.isEnabled === false}
                data-test-id={`pos-pm-preload-${c.id}`}
              />
              {companyPaymentMethodAlwaysRequiresReference(c.method) ? (
                <p className="text-xs text-muted-foreground self-center">
                  Referencia obligatoria (no editable)
                </p>
              ) : (
                <Switch
                  checked={r?.requireReference === true}
                  onChange={(v) => patchRow(c.id, { requireReference: v })}
                  label="Pide referencia"
                  labelPosition="right"
                  disabled={disabled || r?.isEnabled === false}
                  data-test-id={`pos-pm-require-ref-${c.id}`}
                />
              )}
              <Switch
                checked={r?.isDefaultForChange === true}
                onChange={(v) => setUniqueDefault(c.id, v)}
                label="Default vuelto"
                labelPosition="right"
                disabled={disabled || r?.isEnabled === false || c.method !== "CASH"}
                data-test-id={`pos-pm-default-${c.id}`}
              />
            </div>

            {c.method === "TRANSFER" && bankAccountOptions.length > 0 ? (
              <div className="mt-3">
                <Select
                  label="Cuenta bancaria destino preferente"
                  placeholder="Seleccionar cuenta"
                  value={r?.bankAccountKey ?? null}
                  onChange={(id) =>
                    patchRow(c.id, { bankAccountKey: id == null || id === "" ? null : String(id) })
                  }
                  options={bankAccountOptions}
                  alwaysShowLabel
                  disabled={disabled || r?.isEnabled === false}
                  data-test-id={`pos-pm-bank-account-${c.id}`}
                />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
});

