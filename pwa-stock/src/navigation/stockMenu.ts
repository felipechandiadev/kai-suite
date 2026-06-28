import type { SideBarMenuItem } from "@/shared/components/SideBar/SideBar";
import { CREATE_PRODUCT_PATH } from "@/features/product/lib/product-routes";
import { SCAN_PATH, SEARCH_PATH } from "@/features/variant/lib/variant-routes";

/** Menú lateral StockControl (misma estructura que pwa-admin SideBar). */
export const stockMenuItems: SideBarMenuItem[] = [
  { id: "stock-scan", label: "Escanear", url: SCAN_PATH },
  { id: "stock-search", label: "Buscador", url: SEARCH_PATH },
  { id: "stock-create-product", label: "Crear producto", url: CREATE_PRODUCT_PATH },
  { id: "stock-about", label: "Acerca de", url: "/about" },
];
