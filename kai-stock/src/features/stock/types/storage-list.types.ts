export const STORAGE_TYPES = [
  "WAREHOUSE",
  "STORE",
  "COLD_ROOM",
  "TRANSIT",
  "PRODUCTION_INPUTS",
] as const;
export type StorageType = (typeof STORAGE_TYPES)[number];

export const STORAGE_CATEGORIES = ["IN_BRANCH", "CENTRAL", "EXTERNAL"] as const;
export type StorageCategory = (typeof STORAGE_CATEGORIES)[number];

export type StorageListItem = {
  id: string;
  name: string;
  code: string | null;
  type: StorageType;
  category: StorageCategory;
  branchId: string | null;
  branch: { id: string; name: string } | null;
  address: string | null;
  location: unknown;
  capacity: number | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type ListStoragesResult =
  | { success: true; storages: StorageListItem[] }
  | { success: false; error: string; storages: [] };

export type CreateStorageResult =
  | { success: true; storage: StorageListItem }
  | { success: false; error: string };

export type UpdateStorageResult =
  | { success: true; storage: StorageListItem }
  | { success: false; error: string };

export type DeleteStorageResult = { success: true } | { success: false; error: string };

export function storageTypeLabel(t: StorageType): string {
  switch (t) {
    case "WAREHOUSE":
      return "Bodega";
    case "STORE":
      return "Sala de venta";
    case "COLD_ROOM":
      return "Cámara fría";
    case "TRANSIT":
      return "Tránsito";
    case "PRODUCTION_INPUTS":
      return "Insumos para producción";
    default:
      return t;
  }
}

export function storageCategoryLabel(c: StorageCategory): string {
  switch (c) {
    case "IN_BRANCH":
      return "En sucursal";
    case "CENTRAL":
      return "Central";
    case "EXTERNAL":
      return "Externo";
    default:
      return c;
  }
}
