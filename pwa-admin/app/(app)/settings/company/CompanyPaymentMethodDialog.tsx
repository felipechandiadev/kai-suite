"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog } from "@kai/ui";
import { TextField } from "@kai/ui";
import { Select } from "@kai/ui";
import { Switch } from "@kai/ui";
import { Button } from "@kai/ui";
import { Alert } from "@kai/ui";
import {
  COMPANY_PAYMENT_METHOD_LABELS,
  companyPaymentMethodAlwaysRequiresReference,
  companyPaymentMethodLabel,
  POS_IMPLICIT_PAYMENT_METHOD_IDS,
  type CompanyPaymentMethodConfig,
  type CompanyPaymentMethodId,
} from "@/features/companies/types/company-payment-methods.types";
import type { CompanyVoucherKind } from "@/features/companies/types/company-voucher-kinds.types";

type Props = {
  open: boolean;
  onClose: () => void;
  internalCreditEnabled?: boolean;
  initial: CompanyPaymentMethodConfig | null;
  onConfirm: (item: CompanyPaymentMethodConfig) => Promise<void> | void;
  busy?: boolean;
  error?: string | null;
  /** Tipos activos para enlazar cuando method === VOUCHER. */
  voucherKinds?: CompanyVoucherKind[];
};

const METHOD_OPTIONS: { id: CompanyPaymentMethodId; label: string }[] = (
  Object.keys(COMPANY_PAYMENT_METHOD_LABELS) as CompanyPaymentMethodId[]
)
  .filter((id) => !(POS_IMPLICIT_PAYMENT_METHOD_IDS as string[]).includes(id))
  .map((id) => ({ id, label: companyPaymentMethodLabel(id) }));

function newClientId(): string {
  if (
    typeof globalThis !== "undefined" &&
    typeof (globalThis as any).crypto?.randomUUID === "function"
  ) {
    return (globalThis as any).crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function CompanyPaymentMethodDialog({
  open,
  onClose,
  internalCreditEnabled = true,
  initial,
  onConfirm,
  busy,
  error,
  voucherKinds = [],
}: Props) {
  const editing = !!initial;
  const [method, setMethod] = useState<CompanyPaymentMethodId>("CASH");
  const [alias, setAlias] = useState("");
  const [bankAccountKey, setBankAccountKey] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [voucherKindId, setVoucherKindId] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const activeKinds = useMemo(
    () => voucherKinds.filter((k) => k.isActive),
    [voucherKinds],
  );

  useEffect(() => {
    if (!open) return;
    setLocalError(null);
    if (initial) {
      setMethod(initial.method);
      setAlias(initial.alias ?? "");
      setBankAccountKey(initial.bankAccountKey ?? "");
      setIsActive(initial.isActive);
      setVoucherKindId(initial.voucherKindId ?? null);
    } else {
      setMethod("CASH");
      setAlias("");
      setBankAccountKey("");
      setIsActive(true);
      setVoucherKindId(null);
    }
  }, [open, initial]);

  const title = useMemo(
    () => (editing ? "Editar medio de pago" : "Nuevo medio de pago"),
    [editing],
  );

  const methodOptions = useMemo(() => {
    const base = METHOD_OPTIONS.filter(
      (o) => internalCreditEnabled || o.id !== "INTERNAL_CREDIT",
    );
    const ensureOption = (id: CompanyPaymentMethodId) => {
      if (base.some((o) => o.id === id)) return base;
      return [...base, { id, label: companyPaymentMethodLabel(id) }];
    };
    if (initial?.method === "INTERNAL_CREDIT") {
      return ensureOption("INTERNAL_CREDIT");
    }
    if (
      initial?.method &&
      (POS_IMPLICIT_PAYMENT_METHOD_IDS as string[]).includes(initial.method)
    ) {
      return ensureOption(initial.method);
    }
    return base;
  }, [internalCreditEnabled, initial?.method]);

  const kindOptions = useMemo(
    () =>
      activeKinds.map((k) => ({
        id: k.id,
        label: `${k.code} — ${k.name}`,
      })),
    [activeKinds],
  );

  const referenceAlwaysRequired = companyPaymentMethodAlwaysRequiresReference(method);

  async function handleSubmit() {
    setLocalError(null);
    if (method === "VOUCHER") {
      if (!voucherKindId?.trim()) {
        setLocalError("Seleccioná un tipo de voucher.");
        return;
      }
      if (!activeKinds.some((k) => k.id === voucherKindId)) {
        setLocalError("El tipo de voucher seleccionado no está activo.");
        return;
      }
    }
    const kind = activeKinds.find((k) => k.id === voucherKindId);
    const item: CompanyPaymentMethodConfig = {
      id: initial?.id ?? newClientId(),
      method,
      alias:
        alias.trim() ||
        (method === "VOUCHER" && kind ? kind.name : null),
      displayOrder: initial?.displayOrder ?? 0,
      isActive,
      requireReference: referenceAlwaysRequired
        ? true
        : (initial?.requireReference ?? false),
      bankAccountKey: bankAccountKey.trim() || null,
      metadata: initial?.metadata ?? null,
      voucherKindId: method === "VOUCHER" ? voucherKindId : null,
    };
    await onConfirm(item);
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!busy) onClose();
      }}
      title={title}
      size="md"
      scroll="paper"
      hideActions
      data-test-id="company-payment-method-dialog"
    >
      <div className="flex flex-col gap-4 pt-1">
        {error || localError ? (
          <Alert variant="error" data-test-id="company-payment-method-error">
            {localError || error}
          </Alert>
        ) : null}
        <Select
          label="Tipo de medio"
          name="company-payment-method"
          placeholder="Seleccionar"
          options={methodOptions}
          value={method}
          onChange={(id) => {
            const next = (id != null ? String(id) : "CASH") as CompanyPaymentMethodId;
            setMethod(next);
            if (next !== "VOUCHER") setVoucherKindId(null);
          }}
          alwaysShowLabel
          disabled={busy}
          data-test-id="company-payment-method-select"
        />
        {method === "VOUCHER" ? (
          kindOptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Configurá tipos de voucher en la sección inferior antes de
              agregar este medio.
            </p>
          ) : (
            <Select
              label="Tipo de voucher"
              name="company-payment-method-voucher-kind"
              placeholder="Seleccionar tipo"
              options={kindOptions}
              value={voucherKindId}
              onChange={(id) => {
                const vid = id != null ? String(id) : null;
                setVoucherKindId(vid);
                const kind = activeKinds.find((k) => k.id === vid);
                if (kind && !alias.trim()) {
                  setAlias(kind.name);
                }
              }}
              alwaysShowLabel
              disabled={busy}
              data-test-id="company-payment-method-voucher-kind"
            />
          )
        ) : null}
        <TextField
          label="Alias (opcional)"
          name="company-payment-method-alias"
          value={alias}
          onChange={(e) => setAlias(e.target.value)}
          placeholder="Ej. Banco Estado"
          disabled={busy}
          data-test-id="company-payment-method-alias"
        />
        <TextField
          label="Cuenta / banco asociado (opcional)"
          name="company-payment-method-bank"
          value={bankAccountKey}
          onChange={(e) => setBankAccountKey(e.target.value)}
          placeholder="Clave de tesorería"
          disabled={busy}
          data-test-id="company-payment-method-bank"
        />
        <Switch
          checked={isActive}
          onChange={setIsActive}
          disabled={busy}
          label="Activo (la empresa lo acepta)"
          labelPosition="right"
          data-test-id="company-payment-method-active"
        />
        {referenceAlwaysRequired ? (
          <p
            className="text-xs text-muted-foreground"
            data-test-id="company-payment-method-ref-required-hint"
          >
            Este medio exige referencia obligatoria. No se puede desactivar.
          </p>
        ) : null}
        <div className="mt-2 flex justify-end gap-2">
          <Button
            variant="secondary"
            type="button"
            disabled={busy}
            onClick={() => onClose()}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            type="button"
            loading={busy}
            onClick={() => void handleSubmit()}
            data-test-id="company-payment-method-submit"
          >
            {editing ? "Guardar cambios" : "Agregar"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
