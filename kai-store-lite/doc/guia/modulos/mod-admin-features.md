# Módulo — Admin features (páginas y UI)

Patrón por entidad (repetir en cada carpeta listada en el árbol):

| Archivo | Exports |
|---------|---------|
| `*ListPage.tsx` | `XListPage` — ruta lista |
| `*DetailPage.tsx` | `XDetailPage` — ruta detalle |
| `ui/XPanel.tsx` | `XPanel` — grid + CTA |
| `ui/CreateXDialog.tsx` | `CreateXDialog` — props `open/onOpenChange/onCreated` |
| `ui/UpdateXDialog.tsx` | `UpdateXDialog` — props `open/entity/onUpdated` |
| `hooks/useXList.ts` | `useXList()` — data+filter+refresh |
| `types.ts` | tipos de dominio UI |

## `AdminRoutes.tsx` / `AdminLayout.tsx` / `navigation.ts`

| Export | Rol |
|--------|-----|
| `AdminRoutes` | `<Routes>` todas rutas IN |
| `AdminLayout` | sidebar + `<Outlet>` |
| `liteMainMenuItems` | SideBarMenuItem[] Lite |
| `AdminLoginPage` | login |

## Dashboard
| Archivo | Exports |
|---------|---------|
| `dashboard/DashboardPage.tsx` | `DashboardPage` |
| `dashboard/ui/DashboardPanel.tsx` | `DashboardPanel` |
| `dashboard/hooks/useDashboardMetrics.ts` | `useDashboardMetrics` |

## Sales — customers, POS, cash-sessions, price-lists, promotions
Aplicar patrón colección a:
- `features/sales/customers/`
- `features/sales/points-of-sale/`
- `features/sales/cash-sessions/`
- `features/sales/price-lists/`
- `features/sales/promotions/`

Exports por entidad: `CustomersListPage`, `CustomerDetailPage`, `CreateCustomerDialog`, `UpdateCustomerDialog`, `useCustomersList`, … (análogo POS, CashSession, PriceList, Promotion).

## Sales — transactions
| Archivo | Exports |
|---------|---------|
| `transactions/SalesTransactionsLayout.tsx` | tabs sales/payments/quotations/returns |
| `transactions/SalesListPage.tsx` | `SalesListPage` |
| `transactions/SaleDetailPage.tsx` | `SaleDetailPage` |
| `transactions/PaymentsListPage.tsx` | `PaymentsListPage` |
| `transactions/QuotationsListPage.tsx` | `QuotationsListPage` |
| `transactions/QuotationDetailPage.tsx` | `QuotationDetailPage` |
| `transactions/CustomerReturnsListPage.tsx` | `CustomerReturnsListPage` |
| `transactions/ui/*Panel.tsx` | paneles DataGrid |
| `transactions/hooks/useSalesList.ts` | filtros fecha/caja |

## Purchasing
| Carpeta | Pages exports |
|---------|----------------|
| `receptions/` | `ReceptionsListPage`, `ReceptionCreatePage`, `ReceptionDetailPage`, `CreateReceptionDialog` (si modal), `useReceptionsList` |
| `suppliers/` | patrón colección completo |
| `orders/` | `PurchaseOrdersListPage`, … |
| `purchase-returns/` | `PurchaseReturnsListPage`, `CreatePurchaseReturnPage` |

## Catalog
| Carpeta | Pages exports |
|---------|----------------|
| `products/` | `ProductsListPage`, `ProductDetailPage`, `CreateProductDialog`, `UpdateProductDialog`, `useProductsList` |
| `products/variants/` | `VariantDetailPage`, `UpdateVariantDialog` |
| `categories/` `brands/` `attributes/` | patrón colección |
| `CatalogHomePage.tsx` | hub links |

## Inventory
| Carpeta | Exports |
|---------|---------|
| `stock/` | `StockPage`, `StockPanel`, `useStockLevels` |
| `storages/` | colección Storage |
| `units/` | colección Unit |

## Accounting lite
| Carpeta | Exports |
|---------|---------|
| `taxes/` | `TaxesPage`, CRUD dialogs, `useTaxes` |
| `accounts-receivable/` | `ArPage`, `ArPanel`, `useArOpen` |
| `accounts-payable/` | `ApPage`, `ApPanel`, `useApOpen` |

## Settings
| Carpeta | Exports |
|---------|---------|
| `company/CompanyPage.tsx` | `CompanyPage`, `useCompanyForm` |
| `branches/` | colección Branch |
| `users/` | `UsersPage`, `CreateUserDialog`, `UpdateUserDialog`, `useUsers` |
| `backup/BackupPage.tsx` | `BackupPage` — botones export/restore invoke |
| `about/AboutPage.tsx` | `AboutPage` — version invoke `app_version` |

## Funciones UI compartidas de dialogs (todas)
| Fn en cada Dialog | Rol |
|-------------------|-----|
| `onSubmit` | validar Zod → API → `revalidate`/refresh lista |
| `onOpenChange` | cerrar |
