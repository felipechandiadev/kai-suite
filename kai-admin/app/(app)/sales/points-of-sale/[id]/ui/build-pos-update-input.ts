import type { UpdatePointOfSaleFormInput } from "@/features/sales-points-of-sale/domain/point-of-sale.entity";
import type { PointOfSaleListItem, PosKind } from "@/features/sales-points-of-sale/types/point-of-sale.types";
import type { PriceListListItem } from "@/features/sales-price-lists/types/price-list.types";

export function priceListsFromIds(
  selectedIds: string[],
  catalog: PriceListListItem[],
): UpdatePointOfSaleFormInput["priceLists"] {
  return selectedIds
    .map((id) => catalog.find((p) => p.id === id))
    .filter((p): p is PriceListListItem => Boolean(p))
    .map((p) => ({ id: p.id, name: p.name, isActive: p.isActive }));
}

export function buildPosUpdateInput(
  point: PointOfSaleListItem,
  patch: Partial<{
    name: string;
    branchId: string;
    storageId: string;
    deviceId: string | null;
    isActive: boolean;
    kind: PosKind;
    acceptsPresaleTickets: boolean;
    allowsDeferredPayment: boolean;
    selectedListIds: string[];
    defaultListId: string | null;
  }>,
  priceListCatalog: PriceListListItem[],
): UpdatePointOfSaleFormInput {
  const selectedListIds =
    patch.selectedListIds ??
    (point.priceLists?.length ? point.priceLists.map((p) => p.id) : []);
  const priceLists = priceListsFromIds(selectedListIds, priceListCatalog);
  const defaultPriceListId =
    patch.defaultListId !== undefined
      ? patch.defaultListId
      : point.defaultPriceListId &&
          selectedListIds.includes(point.defaultPriceListId)
        ? point.defaultPriceListId
        : selectedListIds[0] ?? null;

  const kind = patch.kind ?? point.kind ?? "SALE";

  return {
    id: point.id,
    name: (patch.name ?? point.name).trim(),
    branchId: patch.branchId ?? point.branchId ?? "",
    storageId: patch.storageId ?? point.storageId ?? "",
    deviceId:
      patch.deviceId !== undefined
        ? patch.deviceId
        : point.deviceId != null && String(point.deviceId).trim()
          ? String(point.deviceId).trim()
          : null,
    isActive: patch.isActive ?? point.isActive,
    priceLists,
    defaultPriceListId,
    kind,
    acceptsPresaleTickets:
      kind === "SALE"
        ? (patch.acceptsPresaleTickets ?? Boolean(point.acceptsPresaleTickets))
        : false,
    allowsDeferredPayment:
      kind === "SALE"
        ? (patch.allowsDeferredPayment ?? Boolean(point.allowsDeferredPayment))
        : false,
  };
}
