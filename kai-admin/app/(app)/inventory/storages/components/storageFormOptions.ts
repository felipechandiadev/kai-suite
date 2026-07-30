import {
  STORAGE_CATEGORIES_MANUAL,
  STORAGE_TYPES,
  storageCategoryLabel,
  storageTypeLabel,
} from "@/features/inventory-storages/types/storage.types";

export const STORAGE_TYPE_SELECT_OPTIONS = STORAGE_TYPES.map((id) => ({
  id,
  label: storageTypeLabel(id),
}));

export const STORAGE_CATEGORY_SELECT_OPTIONS = STORAGE_CATEGORIES_MANUAL.map((id) => ({
  id,
  label: storageCategoryLabel(id),
}));
