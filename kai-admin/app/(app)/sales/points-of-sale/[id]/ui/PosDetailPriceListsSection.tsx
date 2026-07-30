"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, SelectDefault as Select } from "@kai/ui";
import type { PointOfSaleListItem } from "@/features/sales-points-of-sale/types/point-of-sale.types";
import type { PriceListListItem } from "@/features/sales-price-lists/types/price-list.types";
import { updatePointOfSaleAction } from "@/features/sales-points-of-sale/actions/point-of-sale.action";
import { buildPosUpdateInput } from "./build-pos-update-input";

type Props = {
  point: PointOfSaleListItem;
  priceListCatalog: PriceListListItem[];
  onPointUpdated: (next: PointOfSaleListItem) => void;
};

export function PosDetailPriceListsSection({ point, priceListCatalog, onPointUpdated }: Props) {
  const router = useRouter();
  const [selectedListIds, setSelectedListIds] = useState<string[]>([]);
  const [defaultListId, setDefaultListId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setSelectedListIds(
      point.priceLists?.length ? point.priceLists.map((p) => p.id) : [],
    );
    setDefaultListId(point.defaultPriceListId ?? null);
  }, [point]);

  useEffect(() => {
    if (selectedListIds.length === 0) {
      setDefaultListId(null);
      return;
    }
    setDefaultListId((prev) => {
      if (prev != null && selectedListIds.includes(prev)) return prev;
      return selectedListIds[0] ?? null;
    });
  }, [selectedListIds]);

  const defaultListOptions = useMemo(
    () =>
      selectedListIds
        .map((id) => priceListCatalog.find((p) => p.id === id))
        .filter((p): p is PriceListListItem => Boolean(p))
        .map((p) => ({ id: p.id, label: p.name + (p.isActive ? "" : " (inactiva)") })),
    [selectedListIds, priceListCatalog],
  );

  const toggleList = (id: string) => {
    setSelectedListIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const canSave = !isPending && selectedListIds.length > 0;

  const handleSave = () => {
    setError(null);
    setSuccess(null);
    startTransition(() => {
      void (async () => {
        const input = buildPosUpdateInput(
          point,
          { selectedListIds, defaultListId },
          priceListCatalog,
        );
        const r = await updatePointOfSaleAction(input);
        if (!r.success) {
          setError(r.error);
          return;
        }
        onPointUpdated(r.pointOfSale);
        setSuccess("Listas de precio guardadas.");
        router.refresh();
      })();
    });
  };

  return (
    <div className="space-y-4 rounded-lg border border-border bg-background p-4" data-test-id="pos-detail-listas">
      {error ? <Alert variant="error">{error}</Alert> : null}
      {success ? <Alert variant="success">{success}</Alert> : null}

      <p className="text-sm text-muted-foreground">
        Marca las listas asociadas a este punto de venta y elige la preferente si hay más de una.
      </p>

      {priceListCatalog.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay listas de precio en el catálogo.</p>
      ) : (
        <ul className="max-h-64 space-y-2 overflow-y-auto rounded-md border border-border p-2">
          {priceListCatalog.map((pl) => (
            <li key={pl.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`pos-detail-pl-${pl.id}`}
                className="h-4 w-4 shrink-0 rounded border-border"
                checked={selectedListIds.includes(pl.id)}
                onChange={() => toggleList(pl.id)}
                data-test-id={`pos-detail-pl-${pl.id}`}
              />
              <label htmlFor={`pos-detail-pl-${pl.id}`} className="min-w-0 flex-1 cursor-pointer text-sm">
                {pl.name}
                {!pl.isActive ? (
                  <span className="ml-1 text-xs text-muted-foreground">(inactiva)</span>
                ) : null}
              </label>
            </li>
          ))}
        </ul>
      )}

      {selectedListIds.length > 1 ? (
        <Select
          label="Lista de precio preferente en este POS"
          name="pos-detail-default-list"
          value={defaultListId ?? defaultListOptions[0]?.id}
          onChange={(v) => {
            if (v != null) setDefaultListId(String(v));
          }}
          options={defaultListOptions}
          required
          data-test-id="pos-detail-default-list"
        />
      ) : null}

      <div className="flex justify-end pt-2">
        <Button variant="primary" size="md" onClick={handleSave} disabled={!canSave} data-test-id="pos-detail-listas-save">
          Guardar
        </Button>
      </div>
    </div>
  );
}
