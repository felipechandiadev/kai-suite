"use client";
import LoadingState from '@/shared/components/LoadingState';

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import IconButton from "@/shared/components/IconButton/IconButton";
import Badge from "@/shared/components/Badge/Badge";
import {
  companyPaymentMethodAlwaysRequiresReference,
  companyPaymentMethodLabel,
  type CompanyPaymentMethodConfig,
} from "@/features/companies/types/company-payment-methods.types";
import {
  getCompanyPaymentMethodsAction,
  replaceCompanyPaymentMethodsAction,
} from "@/features/companies/actions/companies-payment-methods.action";
import { getCompanyInternalCustomerCreditSettingsAction } from "@/features/companies/actions/companies-internal-customer-credit.action";
import { CompanyPaymentMethodDialog } from "./CompanyPaymentMethodDialog";

type Props = {
  /** Empresa activa: el endpoint exige un companyId real (uuid). */
  companyId: string;
};

function MethodCard({
  item,
  onEdit,
  onDelete,
  busy,
}: {
  item: CompanyPaymentMethodConfig;
  onEdit: () => void;
  onDelete: () => void;
  busy: boolean;
}) {
  const label = companyPaymentMethodLabel(item.method);
  return (
    <article
      className="flex flex-col gap-2 rounded-xl border border-border bg-background p-4 shadow-sm"
      data-test-id={`company-payment-method-card-${item.id}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-base font-semibold text-foreground">
          {item.alias?.trim() ? item.alias : label}
        </h3>
        {item.isActive ? (
          <Badge variant="success-outlined">Activo</Badge>
        ) : (
          <Badge variant="secondary-outlined">Inactivo</Badge>
        )}
      </div>
      <dl className="grid gap-1 text-sm text-foreground">
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Tipo</dt>
          <dd>{label}</dd>
        </div>
        {item.bankAccountKey ? (
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Cuenta</dt>
            <dd className="font-mono">{item.bankAccountKey}</dd>
          </div>
        ) : null}
        {companyPaymentMethodAlwaysRequiresReference(item.method) || item.requireReference ? (
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Referencia</dt>
            <dd>
              {companyPaymentMethodAlwaysRequiresReference(item.method)
                ? "Obligatoria (fija)"
                : "Opcional configurable"}
            </dd>
          </div>
        ) : null}
      </dl>
      <div className="mt-1 flex justify-end gap-1">
        <IconButton
          icon="Pencil"
          variant="action"
          size="sm"
          ariaLabel="Editar medio de pago"
          disabled={busy}
          onClick={onEdit}
          data-test-id={`company-payment-method-edit-${item.id}`}
        />
        <IconButton
          icon="Trash2"
          variant="neutral"
          size="sm"
          ariaLabel="Eliminar medio de pago"
          disabled={busy}
          onClick={onDelete}
          data-test-id={`company-payment-method-delete-${item.id}`}
        />
      </div>
    </article>
  );
}

export function CompanyPaymentMethodsSection({ companyId }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<CompanyPaymentMethodConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CompanyPaymentMethodConfig | null>(null);
  const [internalCreditEnabled, setInternalCreditEnabled] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    Promise.all([
      getCompanyPaymentMethodsAction(companyId),
      getCompanyInternalCustomerCreditSettingsAction(companyId),
    ])
      .then(([pm, icc]) => {
        if (cancelled) return;
        if (pm.success) {
          setItems(pm.paymentMethods);
        } else {
          setLoadError(pm.error);
        }
        if (icc.success) {
          setInternalCreditEnabled(icc.internalCustomerCredit.enabled);
        }
      })
      .catch((e) => {
        if (cancelled) return;
        setLoadError(e instanceof Error ? e.message : "Error al cargar");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const sorted = useMemo(
    () =>
      [...items].sort(
        (a, b) =>
          (a.displayOrder ?? 0) - (b.displayOrder ?? 0) ||
          a.method.localeCompare(b.method),
      ),
    [items],
  );

  async function persist(next: CompanyPaymentMethodConfig[]) {
    setBusy(true);
    setError(null);
    try {
      const res = await replaceCompanyPaymentMethodsAction(companyId, next);
      if (!res.success) {
        setError(res.error);
        return false;
      }
      setItems(res.paymentMethods);
      router.refresh();
      return true;
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirm(item: CompanyPaymentMethodConfig) {
    let next: CompanyPaymentMethodConfig[];
    const idx = items.findIndex((m) => m.id === item.id);
    if (idx >= 0) {
      next = [...items];
      next[idx] = item;
    } else {
      const maxOrder = items.reduce(
        (acc, m) => Math.max(acc, m.displayOrder ?? 0),
        -1,
      );
      next = [...items, { ...item, displayOrder: maxOrder + 1 }];
    }
    const ok = await persist(next);
    if (ok) {
      setDialogOpen(false);
      setEditing(null);
    }
  }

  async function handleDelete(item: CompanyPaymentMethodConfig) {
    if (busy) return;
    const ok = window.confirm(
      `¿Eliminar el medio de pago "${
        item.alias?.trim() || companyPaymentMethodLabel(item.method)
      }"?`,
    );
    if (!ok) return;
    const next = items.filter((m) => m.id !== item.id);
    await persist(next);
  }

  return (
    <>
      <section
        className="rounded-xl border border-border bg-card p-4 shadow-sm md:p-6"
        data-test-id="settings-company-payment-methods-section"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Medios de pago habilitados para recibir pagos en puntos de venta
          </h2>
          <IconButton
            icon="Plus"
            variant="action"
            size="md"
            ariaLabel="Agregar medio de pago"
            disabled={busy || loading}
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
            data-test-id="settings-company-payment-methods-add"
          />
        </div>

        {loadError ? (
          <p className="text-sm text-error">{loadError}</p>
        ) : loading ? (
          <LoadingState className="flex items-center justify-center py-4" />
        ) : sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aún no hay medios de pago configurados.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {sorted.map((m) => (
              <MethodCard
                key={m.id}
                item={m}
                busy={busy}
                onEdit={() => {
                  setEditing(m);
                  setDialogOpen(true);
                }}
                onDelete={() => void handleDelete(m)}
              />
            ))}
          </div>
        )}
      </section>

      <CompanyPaymentMethodDialog
        open={dialogOpen}
        onClose={() => {
          if (busy) return;
          setDialogOpen(false);
          setEditing(null);
          setError(null);
        }}
        internalCreditEnabled={internalCreditEnabled}
        initial={editing}
        onConfirm={handleConfirm}
        busy={busy}
        error={error}
      />
    </>
  );
}
