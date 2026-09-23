import { Routes, Route, Navigate } from "react-router-dom";
import { AdminSidebar } from "@/shared/components/AdminSidebar";
import { ADMIN_ROUTES } from "@/config/routes";
import { AdminHomePage } from "./pages/AdminHomePage";
import { SalesTransactionsPage } from "./pages/SalesTransactionsPage";
import { SalesPosPage } from "./pages/SalesPosPage";
import { CashSessionsPage } from "./pages/CashSessionsPage";
import { CatalogProductsPage } from "./pages/CatalogProductsPage";
import { CatalogVariantDetailPage } from "./pages/CatalogVariantDetailPage";
import { InventoryUnitsPage } from "./pages/InventoryUnitsPage";
import { InventoryStoragesPage } from "./pages/InventoryStoragesPage";
import { InventoryStockPage } from "./pages/InventoryStockPage";
import { InventoryCategoriesPage } from "./pages/InventoryCategoriesPage";
import { InventoryAttributesPage } from "./pages/InventoryAttributesPage";
import { ReportsSalesPage } from "./pages/ReportsSalesPage";
import { CompanyPage } from "./pages/CompanyPage";
import { UsersPage } from "./pages/UsersPage";
import { BackupPage } from "./pages/BackupPage";
import { AboutPage } from "./pages/AboutPage";
import { SettingsPrintersPage } from "./pages/SettingsPrintersPage";

export function AdminRoutes() {
  return (
    <div className="flex h-full min-h-0">
      <AdminSidebar />
      <div className="min-w-0 flex-1 overflow-auto p-6">
        <Routes>
          <Route path="/" element={<Navigate to={ADMIN_ROUTES.home} replace />} />
          <Route path={ADMIN_ROUTES.home} element={<AdminHomePage />} />
          <Route path={ADMIN_ROUTES.salesTransactions} element={<SalesTransactionsPage />} />
          <Route path={ADMIN_ROUTES.salesPos} element={<SalesPosPage />} />
          <Route path={ADMIN_ROUTES.salesCashSessions} element={<CashSessionsPage />} />
          <Route
            path={ADMIN_ROUTES.catalog}
            element={<Navigate to={ADMIN_ROUTES.catalogProducts} replace />}
          />
          <Route path={ADMIN_ROUTES.catalogProducts} element={<CatalogProductsPage />} />
          <Route
            path="/admin/catalog/products/variants/:variantId"
            element={<CatalogVariantDetailPage />}
          />
          <Route path={ADMIN_ROUTES.inventoryUnits} element={<InventoryUnitsPage />} />
          <Route path={ADMIN_ROUTES.inventoryStorages} element={<InventoryStoragesPage />} />
          <Route path={ADMIN_ROUTES.inventoryStock} element={<InventoryStockPage />} />
          <Route path={ADMIN_ROUTES.inventoryCategories} element={<InventoryCategoriesPage />} />
          <Route path={ADMIN_ROUTES.inventoryAttributes} element={<InventoryAttributesPage />} />
          <Route path={ADMIN_ROUTES.reportsSales} element={<ReportsSalesPage />} />
          <Route path={ADMIN_ROUTES.company} element={<CompanyPage />} />
          <Route path={ADMIN_ROUTES.users} element={<UsersPage />} />
          <Route path={ADMIN_ROUTES.printers} element={<SettingsPrintersPage />} />
          <Route path={ADMIN_ROUTES.backup} element={<BackupPage />} />
          <Route path={ADMIN_ROUTES.about} element={<AboutPage />} />
          {/* Legacy OUT routes → Panel */}
          <Route path="/admin/clients" element={<Navigate to={ADMIN_ROUTES.home} replace />} />
          <Route path="/admin/pos" element={<Navigate to={ADMIN_ROUTES.salesPos} replace />} />
          <Route
            path="/admin/cash-sessions"
            element={<Navigate to={ADMIN_ROUTES.salesCashSessions} replace />}
          />
          <Route path="/admin/prices" element={<Navigate to={ADMIN_ROUTES.home} replace />} />
          <Route path="/admin/promos" element={<Navigate to={ADMIN_ROUTES.home} replace />} />
          <Route path="/admin/stock" element={<Navigate to={ADMIN_ROUTES.inventoryStock} replace />} />
          <Route
            path="/admin/warehouses"
            element={<Navigate to={ADMIN_ROUTES.inventoryStorages} replace />}
          />
          <Route path="/admin/receipts" element={<Navigate to={ADMIN_ROUTES.home} replace />} />
          <Route path="/admin/suppliers" element={<Navigate to={ADMIN_ROUTES.home} replace />} />
          <Route path="/admin/tax" element={<Navigate to={ADMIN_ROUTES.home} replace />} />
          <Route path="/admin/ar" element={<Navigate to={ADMIN_ROUTES.home} replace />} />
          <Route path="/admin/ap" element={<Navigate to={ADMIN_ROUTES.home} replace />} />
          <Route path="/admin/branch" element={<Navigate to={ADMIN_ROUTES.home} replace />} />
          <Route path="/admin/company" element={<Navigate to={ADMIN_ROUTES.company} replace />} />
          <Route path="/admin/users" element={<Navigate to={ADMIN_ROUTES.users} replace />} />
          <Route path="/admin/backup" element={<Navigate to={ADMIN_ROUTES.backup} replace />} />
          <Route path="/admin/about" element={<Navigate to={ADMIN_ROUTES.about} replace />} />
          <Route path="*" element={<Navigate to={ADMIN_ROUTES.home} replace />} />
        </Routes>
      </div>
    </div>
  );
}
