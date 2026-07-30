import type { PosProductSearchItem } from "@/features/pos-products/types/pos-product.types";

export type OfflineCatalogRow = PosProductSearchItem & {
  /** PK compuesta: `{posId}:{priceListId}:{variantId}` */
  id: string;
  pointOfSaleId: string;
  priceListId: string;
  snapshotAt: string;
  /** Nombre normalizado para búsqueda local (sin acentos, minúsculas). */
  searchName: string;
};

export type OfflineCatalogMetaRow = {
  /** `{posId}:{priceListId}` */
  id: string;
  pointOfSaleId: string;
  priceListId: string;
  snapshotAt: string;
  rowCount: number;
  ready: boolean;
  schemaVersion: number;
  downloadedAt: string;
};

export type OfflineCatalogSnapshotApiResponse = {
  success: boolean;
  items?: PosProductSearchItem[];
  snapshotAt?: string;
  totalCount?: number;
  nextCursor?: string;
  message?: string;
  statusCode?: number;
};

export type OfflineCatalogDownloadProgress = {
  downloaded: number;
  /** Filas ya persistidas en IndexedDB (catálogo Dexie). */
  persisted: number;
  total: number;
};
