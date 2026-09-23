# Módulo — Inventario explícito Admin (archivos × exports)

Lista **completa** de archivos UI Admin Lite. Donde el patrón se repite, los exports son siempre los de la tabla “Patrón colección”.

## Patrón colección (aplicar tal cual)

Para entidad `Foo`:

| Archivo | Exports |
|---------|---------|
| `FooListPage.tsx` | `FooListPage` |
| `FooDetailPage.tsx` | `FooDetailPage` (si hay detalle) |
| `ui/FooPanel.tsx` | `FooPanel` |
| `ui/CreateFooDialog.tsx` | `CreateFooDialog` |
| `ui/UpdateFooDialog.tsx` | `UpdateFooDialog` |
| `ui/DeleteFooDialog.tsx` | `DeleteFooDialog` (si aplica) |
| `hooks/useFooList.ts` | `useFooList` |
| `hooks/useFooForm.ts` | `useFooForm` (opcional) |
| `types.ts` | `Foo`, `FooCreateInput`, `FooUpdateInput` |

## Raíz admin
| Archivo | Exports |
|---------|---------|
| `AdminRoutes.tsx` | `AdminRoutes` |
| `AdminLayout.tsx` | `AdminLayout` |
| `navigation.ts` | `liteMainMenuItems`, `filterMenuByRole` |
| `AdminLoginPage.tsx` | `AdminLoginPage` |

## dashboard/
| Archivo | Exports |
|---------|---------|
| `DashboardPage.tsx` | `DashboardPage` |
| `ui/DashboardPanel.tsx` | `DashboardPanel` |
| `ui/KpiCard.tsx` | `KpiCard` |
| `hooks/useDashboardMetrics.ts` | `useDashboardMetrics` |
| `types.ts` | `DashboardMetrics` |

## sales/customers/
Patrón colección + `CustomerDetailPage`, `ui/CustomerBalancePanel.tsx` → `CustomerBalancePanel`

## sales/points-of-sale/
Patrón + `PosDetailPage`, `ui/PosPaymentMethodsPanel.tsx` → `PosPaymentMethodsPanel`

## sales/cash-sessions/
| Archivo | Exports |
|---------|---------|
| `CashSessionsListPage.tsx` | `CashSessionsListPage` |
| `CashSessionDetailPage.tsx` | `CashSessionDetailPage` |
| `ui/CashSessionsPanel.tsx` | `CashSessionsPanel` |
| `hooks/useCashSessionsList.ts` | `useCashSessionsList` |
| `types.ts` | `CashSession` |

## sales/price-lists/
Patrón + `ui/PriceListItemsPanel.tsx` → `PriceListItemsPanel`, `hooks/usePriceListItems.ts`

## sales/promotions/
Patrón colección completo `Promotion*`

## sales/transactions/
| Archivo | Exports |
|---------|---------|
| `SalesTransactionsLayout.tsx` | `SalesTransactionsLayout` |
| `sales-transactions-tabs.ts` | `salesTransactionTabs` |
| `SalesListPage.tsx` | `SalesListPage` |
| `SaleDetailPage.tsx` | `SaleDetailPage` |
| `PaymentsListPage.tsx` | `PaymentsListPage` |
| `QuotationsListPage.tsx` | `QuotationsListPage` |
| `QuotationDetailPage.tsx` | `QuotationDetailPage` |
| `CustomerReturnsListPage.tsx` | `CustomerReturnsListPage` |
| `ui/SalesPanel.tsx` | `SalesPanel` |
| `ui/PaymentsPanel.tsx` | `PaymentsPanel` |
| `ui/QuotationsPanel.tsx` | `QuotationsPanel` |
| `ui/CustomerReturnsPanel.tsx` | `CustomerReturnsPanel` |
| `hooks/useSalesList.ts` | `useSalesList` |
| `hooks/usePaymentsList.ts` | `usePaymentsList` |
| `hooks/useQuotationsList.ts` | `useQuotationsList` |
| `types.ts` | `SaleRow`, `PaymentRow`, `QuotationRow` |

## purchasing/receptions/
| Archivo | Exports |
|---------|---------|
| `ReceptionsListPage.tsx` | `ReceptionsListPage` |
| `ReceptionCreatePage.tsx` | `ReceptionCreatePage` |
| `ReceptionDetailPage.tsx` | `ReceptionDetailPage` |
| `ui/ReceptionsPanel.tsx` | `ReceptionsPanel` |
| `ui/ReceptionLinesEditor.tsx` | `ReceptionLinesEditor` |
| `hooks/useReceptionsList.ts` | `useReceptionsList` |
| `hooks/useReceptionForm.ts` | `useReceptionForm` |
| `types.ts` | `Reception`, `ReceptionLine` |

## purchasing/suppliers/
Patrón `Supplier*` completo

## purchasing/orders/
Patrón `PurchaseOrder*` (lista + detalle + create)

## purchasing/purchase-returns/
Patrón `PurchaseReturn*` + `PurchaseReturnCreatePage`

## purchasing/payments/ (tab transacciones)
| Archivo | Exports |
|---------|---------|
| `SupplierPaymentsListPage.tsx` | `SupplierPaymentsListPage` |
| `ui/SupplierPaymentsPanel.tsx` | `SupplierPaymentsPanel` |
| `hooks/useSupplierPaymentsList.ts` | `useSupplierPaymentsList` |

## catalog/
| Archivo | Exports |
|---------|---------|
| `CatalogHomePage.tsx` | `CatalogHomePage` |
| `products/ProductsListPage.tsx` | `ProductsListPage` |
| `products/ProductDetailPage.tsx` | `ProductDetailPage` |
| `products/ui/ProductsPanel.tsx` | `ProductsPanel` |
| `products/ui/CreateProductDialog.tsx` | `CreateProductDialog` |
| `products/ui/UpdateProductDialog.tsx` | `UpdateProductDialog` |
| `products/hooks/useProductsList.ts` | `useProductsList` |
| `products/types.ts` | `Product`, `ProductTypeLite` |
| `products/variants/VariantDetailPage.tsx` | `VariantDetailPage` |
| `products/variants/ui/UpdateVariantDialog.tsx` | `UpdateVariantDialog` |
| `products/variants/ui/VariantPricesPanel.tsx` | `VariantPricesPanel` |
| `categories/*` | patrón `Category*` |
| `brands/*` | patrón `Brand*` |
| `attributes/*` | patrón `Attribute*` |

## inventory/
| Archivo | Exports |
|---------|---------|
| `stock/StockPage.tsx` | `StockPage` |
| `stock/ui/StockPanel.tsx` | `StockPanel` |
| `stock/hooks/useStockLevels.ts` | `useStockLevels` |
| `storages/*` | patrón `Storage*` |
| `units/*` | patrón `Unit*` |

## accounting/
| Archivo | Exports |
|---------|---------|
| `taxes/*` | patrón `Tax*` |
| `accounts-receivable/ArPage.tsx` | `ArPage` |
| `accounts-receivable/ui/ArPanel.tsx` | `ArPanel` |
| `accounts-receivable/hooks/useArOpen.ts` | `useArOpen` |
| `accounts-payable/ApPage.tsx` | `ApPage` |
| `accounts-payable/ui/ApPanel.tsx` | `ApPanel` |
| `accounts-payable/hooks/useApOpen.ts` | `useApOpen` |

## settings/
| Archivo | Exports |
|---------|---------|
| `company/CompanyPage.tsx` | `CompanyPage` |
| `company/ui/CompanyForm.tsx` | `CompanyForm` |
| `company/hooks/useCompanyForm.ts` | `useCompanyForm` |
| `branches/*` | patrón `Branch*` |
| `users/UsersPage.tsx` | `UsersPage` |
| `users/ui/UsersPanel.tsx` | `UsersPanel` |
| `users/ui/CreateUserDialog.tsx` | `CreateUserDialog` |
| `users/ui/UpdateUserDialog.tsx` | `UpdateUserDialog` |
| `users/ui/UserRolesField.tsx` | `UserRolesField` |
| `users/hooks/useUsers.ts` | `useUsers` |
| `backup/BackupPage.tsx` | `BackupPage` |
| `backup/ui/BackupPanel.tsx` | `BackupPanel` |
| `backup/hooks/useBackupActions.ts` | `useBackupActions` — `exportBackup`, `restoreBackup` |
| `about/AboutPage.tsx` | `AboutPage` |
