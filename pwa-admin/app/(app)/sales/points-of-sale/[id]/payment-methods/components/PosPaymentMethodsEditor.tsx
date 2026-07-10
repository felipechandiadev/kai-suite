"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BasicPageLayout } from "@kai/ui";
import { Button } from "@kai/ui";
import { TextField } from "@kai/ui";
import { Switch } from "@kai/ui";
import { Alert } from "@kai/ui";
import {
  COMPANY_PAYMENT_METHOD_LABELS,
  companyPaymentMethodAlwaysRequiresReference,
  POS_CONFIGURABLE_METHOD_IDS,
  type CompanyPaymentMethodConfig,
} from "@/features/companies/types/company-payment-methods.types";
import {
  syncPosPaymentDraftWithCatalog,
  type PosPaymentMethodConfig,
} from "@/features/sales-points-of-sale/types/pos-payment-methods.types";
import { replacePosPaymentMethodsAction } from "@/features/sales-points-of-sale/actions/pos-payment-methods.action";

type Props = {
  posId: string;
  posLabel: string;
  initialCatalog: CompanyPaymentMethodConfig[];
  initialPosList: PosPaymentMethodConfig[];
  initialError: string | null;
};

type RowState = PosPaymentMethodConfig;

export function PosPaymentMethodsEditor({
  posId,
  posLabel,
  initialCatalog,
  initialPosList,
  initialError,
}: Props) {
  const [error, setError] = useState<string | null>(initialError);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  /**
   * Catálogo filtrado: solo medios activos en empresa y aptos para POS
   * (excluye MIXED/CREDIT/INTERNAL_CREDIT). Mantiene displayOrder.
   */
  const usableCatalog = useMemo(
    () =>
      initialCatalog
        .filter(
          (c) =>
            c.isActive &&
            (POS_CONFIGURABLE_METHOD_IDS as string[]).includes(c.method),
        )
        .slice()
        .sort((a, b) => a.displayOrder - b.displayOrder),
    [initialCatalog],
  );

  const syncedPosList = useMemo(
    () => syncPosPaymentDraftWithCatalog(initialCatalog, initialPosList),
    [initialCatalog, initialPosList],
  );

  const initialMap = useMemo(() => {
    const map = new Map<string, RowState>();
    for (const item of syncedPosList) {
      map.set(item.companyPaymentMethodId, item);
    }
    return map;
  }, [syncedPosList]);

  /** Estado: por cada entrada del catálogo, lo que el POS configura. */
  const [byId, setById] = useState<Record<string, RowState>>(() => {
    const out: Record<string, RowState> = {};
    for (const c of usableCatalog) {
      out[c.id] = initialMap.get(c.id) ?? {
        companyPaymentMethodId: c.id,
        isEnabled: false,
        preloadOnPaymentScreen: false,
        preloadOrder: null,
        isDefaultForChange: false,
        bankAccountKey: c.bankAccountKey ?? null,
        requireReference: null,
      };
    }
    return out;
  });

  const update = useCallback(
    (id: string, patch: Partial<RowState>) => {
      setById((prev) => {
        const isDisabling = patch.isEnabled === false;
        return {
          ...prev,
          [id]: {
            ...prev[id],
            ...patch,
            ...(isDisabling ? { isDefaultForChange: false } : null),
          },
        };
      });
    },
    [],
  );

  const setUniqueDefault = useCallback(
    (id: string, isDefault: boolean) => {
      const cmp = usableCatalog.find((x) => x.id === id);
      if (!cmp || cmp.method !== "CASH") {
        return;
      }
      setById((prev) => {
        const next = { ...prev };
        for (const k of Object.keys(next)) {
          next[k] = { ...next[k], isDefaultForChange: false };
        }
        if (isDefault) {
          next[id] = { ...next[id], isDefaultForChange: true };
        }
        return next;
      });
    },
    [usableCatalog],
  );

  const handleSave = useCallback(() => {
    setError(null);
    setSuccess(null);
    startTransition(() => {
      void (async () => {
        const payload: PosPaymentMethodConfig[] = usableCatalog.map((c) => ({
          companyPaymentMethodId: c.id,
          isEnabled: byId[c.id]?.isEnabled === true,
          preloadOnPaymentScreen:
            byId[c.id]?.preloadOnPaymentScreen === true,
          preloadOrder: byId[c.id]?.preloadOrder ?? null,
          isDefaultForChange: byId[c.id]?.isDefaultForChange === true,
          bankAccountKey: byId[c.id]?.bankAccountKey ?? null,
          requireReference: companyPaymentMethodAlwaysRequiresReference(c.method)
            ? null
            : byId[c.id]?.requireReference == null
              ? null
              : byId[c.id]?.requireReference === true,
        }));
        const r = await replacePosPaymentMethodsAction(posId, payload);
        if (r.success) {
          setSuccess("Cambios guardados.");
          const synced = syncPosPaymentDraftWithCatalog(initialCatalog, r.paymentMethods);
          const nextById: Record<string, RowState> = {};
          for (const c of usableCatalog) {
            const row = synced.find((x) => x.companyPaymentMethodId === c.id);
            nextById[c.id] = row ?? {
              companyPaymentMethodId: c.id,
              isEnabled: false,
              preloadOnPaymentScreen: false,
              preloadOrder: null,
              isDefaultForChange: false,
              bankAccountKey: c.bankAccountKey ?? null,
              requireReference: null,
            };
          }
          setById(nextById);
        } else {
          setError(r.error || "No se pudo guardar");
        }
      })();
    });
  }, [byId, posId, usableCatalog, initialCatalog]);

  return (
    <BasicPageLayout
      title="Medios de pago del POS"
      subtitle={`Configuración local para ${posLabel}.`}
      data-test-id="pos-payment-methods-page"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <Link
            href="/sales/points-of-sale"
            className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
            data-test-id="pos-payment-methods-back"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Volver a puntos de venta
          </Link>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleSave}
            disabled={isPending}
            loading={isPending}
            data-test-id="pos-payment-methods-save"
          >
            Guardar cambios
          </Button>
        </div>

        {error ? (
          <Alert variant="error" data-test-id="pos-payment-methods-error">
            {error}
          </Alert>
        ) : null}
        {success ? (
          <Alert variant="success" data-test-id="pos-payment-methods-success">
            {success}
          </Alert>
        ) : null}

        <p className="text-sm text-muted">
          Habilita los medios de la empresa que estarán disponibles en este POS y
          marca cuáles aparecen precargados en la pantalla de cobro. El medio
          “Default para vuelto” se autocompleta con el saldo restante.
        </p>

        {usableCatalog.length === 0 ? (
          <Alert variant="warning">
            La empresa aún no tiene medios de pago aptos para POS. Defínelos en
            Ajustes → Empresas → (empresa) → Medios de pago.
          </Alert>
        ) : (
          <ul
            className="flex flex-col gap-3"
            data-test-id="pos-payment-methods-list"
          >
            {usableCatalog.map((c) => {
              const r = byId[c.id];
              return (
                <li
                  key={c.id}
                  className="rounded-xl border border-border bg-background p-3 shadow-sm"
                  data-test-id={`pos-payment-method-row-${c.id}`}
                >
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto_auto_auto] lg:items-end">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium text-foreground">
                        {c.alias?.trim() || COMPANY_PAYMENT_METHOD_LABELS[c.method]}
                      </span>
                      <span className="text-xs text-muted">
                        {COMPANY_PAYMENT_METHOD_LABELS[c.method]}
                        {c.bankAccountKey ? ` · ${c.bankAccountKey}` : ""}
                      </span>
                    </div>

                    <Switch
                      checked={r?.isEnabled === true}
                      onChange={(v) => update(c.id, { isEnabled: v })}
                      label="Habilitado"
                      labelPosition="right"
                      data-test-id={`pos-pm-enabled-${c.id}`}
                    />
                    <Switch
                      checked={r?.preloadOnPaymentScreen === true}
                      onChange={(v) =>
                        update(c.id, {
                          preloadOnPaymentScreen: v,
                          preloadOrder: v ? r?.preloadOrder ?? 0 : null,
                        })
                      }
                      label="Precargar"
                      labelPosition="right"
                      data-test-id={`pos-pm-preload-${c.id}`}
                    />
                    <div className="w-24">
                      <TextField
                        label="Orden"
                        name={`pos-pm-order-${c.id}`}
                        value={
                          r?.preloadOrder == null
                            ? ""
                            : String(r.preloadOrder)
                        }
                        onChange={(e) => {
                          const raw = e.target.value.trim();
                          if (raw === "") {
                            update(c.id, { preloadOrder: null });
                            return;
                          }
                          const n = Number(raw);
                          if (!Number.isFinite(n)) return;
                          update(c.id, { preloadOrder: Math.trunc(n) });
                        }}
                        placeholder="0"
                        data-test-id={`pos-pm-order-input-${c.id}`}
                        disabled={!r?.preloadOnPaymentScreen}
                      />
                    </div>
                    {companyPaymentMethodAlwaysRequiresReference(c.method) ? (
                      <p className="text-xs text-muted-foreground">
                        Referencia obligatoria (no editable)
                      </p>
                    ) : (
                      <Switch
                        checked={r?.requireReference === true}
                        onChange={(v) => update(c.id, { requireReference: v })}
                        label="Pide referencia"
                        labelPosition="right"
                        data-test-id={`pos-pm-require-ref-${c.id}`}
                      />
                    )}
                    <Switch
                      checked={r?.isDefaultForChange === true}
                      onChange={(v) => setUniqueDefault(c.id, v)}
                      label="Default vuelto"
                      labelPosition="right"
                      disabled={c.method !== "CASH"}
                      data-test-id={`pos-pm-default-${c.id}`}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </BasicPageLayout>
  );
}
