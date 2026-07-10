"use client";
import { LoadingState } from '@kai/ui';

import { useCallback, useEffect, useState } from "react";
import type { CustomerDetailView, UpdateCustomerPayload } from "@/features/sales-customers/types/customer.types";
import { TextField } from "@kai/ui";
import { Select, type Option } from "@kai/ui";
import { IconButton } from "@kai/ui";
import { updateCustomerAction } from "@/features/sales-customers/actions/customer.action";

const PAYMENT_DAY_OPTIONS: Option[] = [
  { id: "5", label: "5" },
  { id: "10", label: "10" },
  { id: "15", label: "15" },
  { id: "20", label: "20" },
  { id: "25", label: "25" },
  { id: "30", label: "30" },
];

function fmtClp(n: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);
}

type CreditDraft = {
  creditLimitStr: string;
  paymentDayOfMonth: string;
};

function draftFromDetail(d: CustomerDetailView): CreditDraft {
  const day = d.paymentDayOfMonth;
  const n = Number(day);
  const validDay = [5, 10, 15, 20, 25, 30].includes(n) ? String(n) : "5";
  return {
    creditLimitStr: String(Math.max(0, Math.round(Number(d.creditLimit) || 0))),
    paymentDayOfMonth: validDay,
  };
}

function parseCreditLimit(str: string): number {
  return Math.max(0, Math.round(Number(str.replace(/\D/g, "")) || 0));
}

function parsePaymentDay(str: string, fallback: number): UpdateCustomerPayload["paymentDayOfMonth"] {
  const d = Number(str);
  return ([5, 10, 15, 20, 25, 30].includes(d) ? d : fallback) as UpdateCustomerPayload["paymentDayOfMonth"];
}

const noopFieldChange = (_e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {};

export function CustomerDetailCreditSection({
  detail,
  loading,
  internalCreditEnabled,
  customerId,
  onDetailUpdated,
}: {
  detail: CustomerDetailView | null;
  loading: boolean;
  internalCreditEnabled: boolean;
  customerId: string;
  onDetailUpdated: (customer: CustomerDetailView) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<CreditDraft | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const canEdit = Boolean(customerId?.trim()) && internalCreditEnabled;

  useEffect(() => {
    setEditing(false);
    setDraft(null);
    setSaveError(null);
  }, [detail?.customerId, detail?.updatedAt]);

  const startEdit = useCallback(() => {
    if (!detail) return;
    setDraft(draftFromDetail(detail));
    setSaveError(null);
    setEditing(true);
  }, [detail]);

  const save = useCallback(async () => {
    if (!detail || !draft || !customerId.trim()) return;
    setSaveError(null);
    setIsSaving(true);
    const creditLimit = parseCreditLimit(draft.creditLimitStr);
    const paymentDayOfMonth = parsePaymentDay(
      draft.paymentDayOfMonth,
      (detail.paymentDayOfMonth != null && [5, 10, 15, 20, 25, 30].includes(Number(detail.paymentDayOfMonth))
        ? Number(detail.paymentDayOfMonth)
        : 5) as number,
    );
    const payload: UpdateCustomerPayload = { creditLimit, paymentDayOfMonth };
    const res = await updateCustomerAction(customerId.trim(), payload);
    setIsSaving(false);
    if (res.success) {
      onDetailUpdated(res.customer);
      setEditing(false);
      setDraft(null);
    } else {
      setSaveError(res.error);
    }
  }, [customerId, detail, draft, onDetailUpdated]);

  if (!internalCreditEnabled) {
    return (
      <p className="text-sm text-muted-foreground">
        El crédito interno no está habilitado para esta empresa.
      </p>
    );
  }
  if (loading) {
    return <LoadingState className="flex items-center justify-center py-4" />;
  }
  if (!detail) {
    return <p className="text-sm text-muted-foreground">Sin datos.</p>;
  }

  const readOnly = !editing;

  return (
    <div className="relative max-w-md text-sm" data-test-id="customer-detail-credit">
      {canEdit ? (
        <div className="absolute right-0 top-0 z-[1]">
          <IconButton
            type="button"
            variant="action"
            size="sm"
            icon={editing ? "Check" : "Pencil"}
            ariaLabel={editing ? "Guardar cambios" : "Editar datos de crédito"}
            isLoading={isSaving}
            disabled={isSaving}
            onClick={() => {
              if (editing) void save();
              else startEdit();
            }}
            data-test-id={editing ? "customer-detail-credit-save" : "customer-detail-credit-edit"}
          />
        </div>
      ) : null}

      {saveError ? (
        <p className="mb-3 pr-14 text-sm text-error" role="alert">
          {saveError}
        </p>
      ) : null}

      <div className="grid gap-4 pr-0 sm:pr-12">
        <TextField
          label="Límite de crédito (CLP)"
          name="customer-credit-limit-detail"
          type="currency"
          currencySymbol="$"
          startSymbol="$"
          value={editing && draft ? draft.creditLimitStr : String(Math.round(Number(detail.creditLimit) || 0))}
          onChange={
            readOnly
              ? noopFieldChange
              : (e) => setDraft((d) => (d ? { ...d, creditLimitStr: e.target.value } : d))
          }
          readOnly={readOnly}
          density="compact"
          data-test-id="customer-credit-limit"
        />

        <TextField
          label="Crédito usado"
          value={fmtClp(detail.usedCredit)}
          onChange={noopFieldChange}
          readOnly
          density="compact"
          data-test-id="customer-credit-used"
        />

        <TextField
          label="Disponible"
          value={fmtClp(detail.availableCredit)}
          onChange={noopFieldChange}
          readOnly
          density="compact"
          data-test-id="customer-credit-available"
        />

        {readOnly ? (
          <TextField
            label="Día de pago del mes"
            value={detail.paymentDayOfMonth != null ? String(detail.paymentDayOfMonth) : "—"}
            onChange={noopFieldChange}
            readOnly
            density="compact"
            data-test-id="customer-credit-payment-day-readonly"
          />
        ) : (
          <Select
            label="Día de pago del mes"
            name="customer-credit-payment-day"
            placeholder="Día de pago"
            options={PAYMENT_DAY_OPTIONS}
            value={draft?.paymentDayOfMonth ?? "5"}
            onChange={(v) =>
              setDraft((d) => (d ? { ...d, paymentDayOfMonth: v != null ? String(v) : "5" } : d))
            }
            disabled={!editing}
            density="compact"
            alwaysShowLabel
            data-test-id="customer-credit-payment-day"
          />
        )}
      </div>
    </div>
  );
}
