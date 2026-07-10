"use client";

import { Alert, IconButton } from "@kai/ui";
import type { VariantPriceListItem } from "../types/pricing.types";
import type { TaxListItem } from "../types/tax.types";
import { formatMoney } from "../lib/format-money";
import type { VariantPriceRowDraft } from "../lib/variant-price-row";
import { VariantPriceRowFields } from "./VariantPriceRowFields";

type Props = {
  item: VariantPriceListItem;
  editing: boolean;
  saving: boolean;
  controlsDisabled?: boolean;
  row: VariantPriceRowDraft | null;
  ivaTaxes: TaxListItem[];
  cardError?: string | null;
  onRowChange: (row: VariantPriceRowDraft) => void;
  onEdit: () => void;
  onSave: () => void;
  onCalculator: () => void;
};

export function VariantPriceListCard({
  item,
  editing,
  saving,
  controlsDisabled = false,
  row,
  ivaTaxes,
  cardError,
  onRowChange,
  onEdit,
  onSave,
  onCalculator,
}: Props) {
  const fieldsDisabled = saving || controlsDisabled;

  return (
    <article
      className="relative rounded-xl border border-border bg-background p-3 pr-14 shadow-sm transition-[border-color]"
      data-test-id={`variant-price-card-${item.priceListId}`}
      data-editing={editing ? "true" : undefined}
    >
      <p className="text-sm font-semibold text-foreground">{item.priceListName}</p>

      {!editing ? (
        <p className="mt-1 text-xs tabular-nums text-muted-foreground">
          Neto {formatMoney(item.netPrice, item.currency)} · Con impuestos{" "}
          {formatMoney(item.grossPrice, item.currency)}
        </p>
      ) : null}

      {editing && row ? (
        <>
          {cardError ? (
            <Alert variant="error" className="mt-2">
              {cardError}
            </Alert>
          ) : null}
          <VariantPriceRowFields
            row={row}
            ivaTaxes={ivaTaxes}
            disabled={fieldsDisabled}
            onChange={onRowChange}
          />
          <div className="mt-2 flex justify-end">
            <IconButton
              icon="Calculator"
              variant="action"
              size="sm"
              ariaLabel="Calculadora precio de venta"
              disabled={fieldsDisabled}
              onClick={onCalculator}
              data-test-id={`variant-price-calc-${item.priceListId}`}
            />
          </div>
        </>
      ) : null}

      <div className="absolute right-2 top-2">
        <IconButton
          icon={editing ? "Save" : "Pencil"}
          variant="action"
          size="sm"
          ariaLabel={editing ? "Guardar precio" : "Editar precio"}
          disabled={controlsDisabled && !editing}
          isLoading={saving}
          onClick={editing ? onSave : onEdit}
          data-test-id={
            editing
              ? `variant-price-save-${item.priceListId}`
              : `variant-price-edit-${item.priceListId}`
          }
        />
      </div>
    </article>
  );
}
