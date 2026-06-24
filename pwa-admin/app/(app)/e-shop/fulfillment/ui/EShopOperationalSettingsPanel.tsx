"use client";

import { useMemo } from "react";
import { Select } from "@/shared/components/Select";
import type { BranchListItem } from "@/features/settings-branches/types/branch.types";
import type { StorageListItem } from "@/features/inventory-storages/types/storage.types";
import { storageTypeLabel } from "@/features/inventory-storages/types/storage.types";
import type { PriceListListItem } from "@/features/sales-price-lists/types/price-list.types";

function buildStorageOptions(storages: StorageListItem[]) {
  return storages
    .filter((s) => s.isActive)
    .sort((a, b) => {
      const branchA = a.branch?.name ?? "";
      const branchB = b.branch?.name ?? "";
      if (branchA !== branchB) {
        return branchA.localeCompare(branchB, "es");
      }
      return a.name.localeCompare(b.name, "es");
    })
    .map((s) => ({
      id: s.id,
      label: s.branch
        ? `${s.branch.name} · ${s.name} (${storageTypeLabel(s.type)})`
        : `${s.name} (${storageTypeLabel(s.type)})`,
    }));
}

export type EShopOperationalFormState = {
  eShopDefaultBranchId: string | null;
  eShopDefaultStorageId: string | null;
  eShopDefaultPriceListId: string | null;
};

type Props = {
  value: EShopOperationalFormState;
  onChange: (next: EShopOperationalFormState) => void;
  branches: BranchListItem[];
  storages: StorageListItem[];
  priceLists: PriceListListItem[];
  disabled?: boolean;
};

export function EShopOperationalSettingsPanel({
  value,
  onChange,
  branches,
  storages,
  priceLists,
  disabled,
}: Props) {
  const branchOptions = useMemo(
    () =>
      branches
        .filter((b) => b.isActive)
        .sort((a, b) => a.name.localeCompare(b.name, "es"))
        .map((b) => ({ id: b.id, label: b.name })),
    [branches],
  );

  const storageOptions = useMemo(() => buildStorageOptions(storages), [storages]);

  const priceListOptions = useMemo(
    () =>
      priceLists
        .sort((a, b) => a.name.localeCompare(b.name, "es"))
        .map((p) => ({ id: p.id, label: p.name })),
    [priceLists],
  );

  return (
    <section className="space-y-4 rounded-lg border border-border p-4">
      <div>
        <h2 className="text-sm font-semibold">Operación de la tienda</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          La tienda web no es un punto de venta. Este almacén define stock visible y reservas de
          encargos. Puede ser el mismo que la vitrina física.
        </p>
      </div>

      <Select
        label="Sucursal eShop"
        name="eShopDefaultBranchId"
        placeholder="Seleccionar sucursal"
        options={[{ id: "", label: "— Sin selección —" }, ...branchOptions]}
        value={value.eShopDefaultBranchId ?? ""}
        disabled={disabled}
        allowClear
        onChange={(id) =>
          onChange({
            ...value,
            eShopDefaultBranchId: id ? String(id) : null,
          })
        }
        data-test-id="eshop-operational-branch"
      />

      <Select
        label="Almacén eShop"
        name="eShopDefaultStorageId"
        placeholder="Seleccionar almacén"
        options={[{ id: "", label: "— Sin selección —" }, ...storageOptions]}
        value={value.eShopDefaultStorageId ?? ""}
        disabled={disabled}
        allowClear
        onChange={(id) => {
          const storageId = id ? String(id) : null;
          const storage = storages.find((s) => s.id === storageId);
          onChange({
            ...value,
            eShopDefaultStorageId: storageId,
            eShopDefaultBranchId: storage?.branchId ?? value.eShopDefaultBranchId,
          });
        }}
        data-test-id="eshop-operational-storage"
      />

      <Select
        label="Lista de precios eShop"
        name="eShopDefaultPriceListId"
        placeholder="Seleccionar lista de precios"
        options={[{ id: "", label: "— Sin selección —" }, ...priceListOptions]}
        value={value.eShopDefaultPriceListId ?? ""}
        disabled={disabled}
        allowClear
        onChange={(id) =>
          onChange({
            ...value,
            eShopDefaultPriceListId: id ? String(id) : null,
          })
        }
        data-test-id="eshop-operational-price-list"
      />
    </section>
  );
}
