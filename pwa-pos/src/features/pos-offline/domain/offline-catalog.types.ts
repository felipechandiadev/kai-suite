import type { PosProductSearchItem } from "@/features/pos-products/types/pos-product.types";

export type OfflineCatalogRow = PosProductSearchItem & {
  pointOfSaleId: string;
  priceListId: string;
  snapshotAt: string;
  /** Nombre normalizado para búsqueda local (sin acentos, minúsculas). */
  searchName: string;
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
  total: number;
};
