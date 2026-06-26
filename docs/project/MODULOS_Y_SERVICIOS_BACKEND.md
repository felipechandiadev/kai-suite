# Backend — Módulos y servicios

Referencia detallada del backend NestJS en `backend/src/`. Complementa [ARQUITECTURA_Y_ECOSISTEMA.md](./ARQUITECTURA_Y_ECOSISTEMA.md) y la guía profunda en [legacy/BACKEND_ARQUITECTURA.md](../legacy/BACKEND_ARQUITECTURA.md).

**Base URL API:** `http://localhost:5030/api` (prefijo global `/api` en `main.ts`).

**Última revisión:** junio 2026.

---

## 1. Convenciones

### 1.1 Estructura de un módulo

Cada bounded context vive en `backend/src/modules/{nombre}/`:

| Capa | Contenido típico |
|------|------------------|
| `domain/` | Entidades TypeORM, enums, tipos de metadata, invariantes |
| `application/` | Services, use cases, commands/queries, handlers CQRS, DTOs internos |
| `infrastructure/` | Repositorios TypeORM, mappers ORM, adaptadores externos |
| `presentation/` | Controllers REST, DTOs HTTP, guards locales |
| `{nombre}.module.ts` | Wiring NestJS |

### 1.2 Patrones de implementación

| Patrón | Módulos ejemplo | Descripción |
|--------|-----------------|-------------|
| **CQRS completo** | `transactions`, `users`, `auth` | Commands/queries + handlers; controller delgado |
| **Service + adapter** | `customers`, `products`, `branches` | `*Service` + `*ServiceAdapter` como fachada |
| **Service clásico** | `receptions`, `remunerations`, `operational-expenses` | Orquestación en un service inyectable |
| **Wrapper fino** | `supplier-invoices`, `supplier-receipts` | Controller delega en `TransactionsModule` |

Los módulos **nuevos** deben imitar el patrón del módulo vecino más cercano, no inventar una tercera forma.

### 1.3 Registro en `AppModule`

| Estado | Significado |
|--------|-------------|
| **Registrado** | Import directo en `app.module.ts` |
| **Dinámico** | `require('./modules/...')` en `AppModule` (`analytics`, `e-shop`, `product-variants`) |
| **Transitivo** | Cargado vía otro módulo (`ledger-entries` vía `transactions`) |
| **Huérfano** | Existe código y controller, pero **no** está en el grafo de arranque |

---

## 2. Infraestructura transversal

### 2.1 Multi-tenant (`common/tenant/`)

| Componente | Rol |
|------------|-----|
| `TenantModule` | Módulo global; registra guard e interceptor |
| `TenantGuard` | Guard global JWT + resolución de `activeCompanyId` (header `X-Active-Company-Id` o default por rol) |
| `TenantInterceptor` | Propaga contexto en `AsyncLocalStorage` |
| `TenantContext` | Acceso a `userId`, `activeCompanyId`, rol desde servicios |
| `TenantSubscriber` | Auto-asigna `companyId` en INSERT TypeORM |
| Decoradores | `@CurrentUser`, `@CurrentCompany`, `@SkipTenant`, `@AdminOnly`, `@SuperAdminOnly` |

Casi toda entidad de negocio lleva `companyId`. Endpoints públicos (e-shop) usan `@SkipTenant` o guards dedicados.

### 2.2 Shared (`backend/src/shared/`)

| Componente | Ubicación | Rol |
|------------|-----------|-----|
| **AccountingEngine** | `application/AccountingEngine.ts` | Motor de partida doble: aplica reglas contables a transacciones |
| **AccountingEngineListener** | `listeners/accounting-engine.listener.ts` | Escucha eventos de transacción y dispara asientos |
| **AuditService** | `application/AuditService.ts` | Auditoría genérica de cambios |
| **CacheService / CacheModule** | `cache/` | Redis opcional + invalidación |
| **EventsModule** | `events/` | Registro de listeners globales |
| **MetricsService** | `metrics/` | Prometheus; endpoint `GET /api/metrics` |
| **WinstonLoggerService** | `logging/` | Logging estructurado |
| **ObservabilityModule** | `observability.module.ts` | Logging + métricas globales |
| **GlobalProvidersModule** | `providers/` | Repositorios TypeORM compartidos |
| **Enums** | `enums/document-type-codes.ts`, `document-prefixes.ts` | Códigos de documentos transaccionales |
| **CQRS base** | `cqrs/` | `BaseCommand`, `BaseQuery`, `BaseDomainEvent` |

### 2.3 Configuración

| Ruta | Rol |
|------|-----|
| `config/config.module.ts` | Variables de entorno (Joi) |
| `config/typeorm.config.ts` | Conexión PostgreSQL |
| `config/data-source.ts` | CLI TypeORM (`migration:run`, `migration:generate`) |
| `migrations/` | Migraciones de esquema |
| `seed/` | Datos de desarrollo (`npm run seed`) |

---

## 3. Núcleo transaccional

El módulo **`transactions`** es el hub central del ERP. La mayoría de operaciones comerciales, de inventario y de pago son transacciones tipadas.

### 3.1 Tipos de transacción (`TransactionType`)

#### Ventas y devoluciones

| Tipo | Uso |
|------|-----|
| `SALE` | Venta POS / mostrador |
| `SALE_RETURN` | Devolución de venta |
| `CUSTOMER_CREDIT_NOTE` | Nota de crédito a cliente |
| `CUSTOMER_CREDIT_NOTE_PAYOUT` | Pago en caja por saldo de NC |
| `QUOTATION` | Cotización sin efecto contable/stock |
| `BACKORDER` | Reserva con anticipo, sin descuento de stock |
| `CUSTOMER_ORDER` | Pedido de cliente |

#### Compras y DTE proveedor

| Tipo | Uso |
|------|-----|
| `PURCHASE` | Compra genérica |
| `PURCHASE_ORDER` | Orden de compra |
| `PURCHASE_RETURN` | Devolución a proveedor |
| `SUPPLIER_INVOICE` | Factura proveedor |
| `SUPPLIER_RECEIPT` | Boleta proveedor |
| `SUPPLIER_HONORARIUM_RECEIPT` | Boleta de honorarios |
| `SUPPLIER_GUIDE` | Guía de despacho proveedor |
| `SUPPLIER_CREDIT_NOTE` | Nota de crédito proveedor |

#### Inventario

| Tipo | Uso |
|------|-----|
| `TRANSFER_OUT` / `TRANSFER_IN` | Traslado entre bodegas |
| `ADJUSTMENT_IN` / `ADJUSTMENT_OUT` | Ajustes manuales |
| `INVENTORY_COUNT` | Conteo físico |
| `INVENTORY_RESERVATION` | Reserva de stock |
| `INVENTORY_BLOCK` / `INVENTORY_UNBLOCK` | Bloqueo/desbloqueo |

#### Pagos y tesorería

| Tipo | Uso |
|------|-----|
| `PAYMENT_IN` | Cobro de cliente |
| `SUPPLIER_PAYMENT` | Pago a proveedor (CxP compras) |
| `PAYROLL_PAYMENT` | Pago liquidación sueldo |
| `EXPENSE_PAYMENT` | Pago gasto operativo |
| `PAYMENT_EXECUTION` | Ejecución real de un pago confirmado |
| `BANK_TO_CASH_TRANSFER` | Traslado banco → caja |
| `CASH_DEPOSIT` | Depósito efectivo a banco |
| `CAPITAL_CONTRIBUTION` | Aporte de capital |
| `BANK_WITHDRAWAL_TO_SHAREHOLDER` | Retiro bancario a socio |
| `CASH_WITHDRAWAL_TO_PETTY_CASH` | Retiro a caja chica |

#### Nómina y gastos

| Tipo | Uso |
|------|-----|
| `PAYROLL` | Liquidación / devengo nómina |
| `OPERATING_EXPENSE` | Gasto operativo (tipo «Otro», sin DTE) |

#### Caja y sesiones

| Tipo | Uso |
|------|-----|
| `CASH_SESSION_OPENING` | Apertura de caja |
| `CASH_SESSION_CLOSING` | Cierre de caja |
| `CASH_SESSION_TO_HUB_TRANSFER` | Traslado cierre → cash hub |
| `CASH_SESSION_WITHDRAWAL` / `CASH_SESSION_DEPOSIT` | Movimientos en sesión |

#### Órdenes / producción

| Tipo | Uso |
|------|-----|
| `SERVICE_ORDER` | Orden de servicio |
| `PRODUCTION_BATCH` | Lote de producción |

### 3.2 Módulo `transactions`

**Ruta base:** `/api/transactions` (+ controllers satélite).

#### Controllers

| Controller | Prefijo | Responsabilidad |
|------------|---------|-----------------|
| `TransactionsController` | `transactions` | CRUD transacciones, búsqueda, journal, completar/anular |
| `SupplierPaymentsController` | `supplier-payments` | Pagos a proveedores |
| `AccountsPayableController` | `accounts-payable` | Lista CxP, contexto de pago, confirmar pago |
| `PurchaseOrdersController` | `purchase-orders` | Órdenes de compra |
| `OperatingExpenseTransactionsController` | `operating-expense-transactions` | Transacciones de gastos operativos |
| `InventoryTransactionsController` | `inventory-transactions` | Movimientos de inventario vía transacciones |

#### Servicios de aplicación

| Servicio | Rol |
|----------|-----|
| `TransactionsService` / `TransactionsServiceAdapter` | Fachada legacy + adaptador CQRS |
| `CreateTransactionUseCase` | Creación central de transacciones |
| `CompletePaymentUseCase` | Confirmación de pagos (AP, proveedor, nómina, gastos) |
| `DocumentNumberService` | Numeración secuencial de documentos |
| `AccountsPayableService` | Listado y lanes de cuentas por pagar |
| `ParentPaymentAggregateService` | Recalcula `amountPaid` / `paymentStatus` del padre |
| `SupplierFiscalDocumentCreateService` | Crea DTE proveedor + hijos de pago |
| `SupplierDocumentPaymentPlanService` | Materializa plan de pago en hijos `SUPPLIER_PAYMENT` |
| `SupplierDocumentFolioGuardService` | Folio único por proveedor + tipo documento |
| `OperatingExpensePaymentPlanService` | Plan de pago para gastos tipo `OTHER` |
| `SupplierFiscalDocumentPaymentAggregateService` | Agregación de pagos en documentos fiscales |
| `PurchaseOrdersService` | Orquestación órdenes de compra |
| `PosSaleLookupService` | Consultas de venta para POS |
| `PosBackorderLookupService` | Consultas backorder POS |
| `PosSaleReceiptPrintService` | Payload impresión ticket venta |
| `CancelBackorderService` | Cancelación de backorders |
| `EventStoreService` | Event store interno del módulo |

#### Handlers CQRS (muestra)

**Commands:** `CreateTransactionCommandHandler`, `CompleteSupplierPaymentCommandHandler`, `VoidTransactionCommandHandler`, `CompleteTransactionCommandHandler`, handlers de inventario.

**Queries:** `GetTransactionByIdQueryHandler`, `SearchTransactionsQueryHandler`, `ListJournalQueryHandler`, `GetSupplierPaymentContextQueryHandler`, `GetMovementsForSessionQueryHandler`, `GetTotalSalesForSessionQueryHandler`.

#### Entidades de dominio

| Entidad | Rol |
|---------|-----|
| `Transaction` | Documento transaccional padre/hijo |
| `DocumentSequence` | Secuencias de numeración |
| `TransactionLine` | Líneas (módulo `transaction-lines`, entidad compartida) |

#### Exporta a otros módulos

`AccountsPayableService`, `SupplierFiscalDocumentCreateService`, `OperatingExpensePaymentPlanService`, `ParentPaymentAggregateService`, `DocumentNumberService`, etc. — usados por `operational-expenses`, `supplier-invoices`, `receptions`, `remunerations`, `cash-sessions`.

---

## 4. Plataforma y autenticación

### 4.1 `auth` — `/api/auth`

| Servicio | Rol |
|----------|-----|
| `AuthService` | Login, refresh, logout |
| `AuthServiceAdapter` | Adaptador CQRS |

Sin entidad propia; opera sobre `User` y `Company`.

### 4.2 `users` — `/api/users`

| Entidad | Servicios |
|---------|-----------|
| `User` | `UsersService`, `UsersServiceAdapter` |

Gestión de usuarios, roles, vinculación a empresas.

### 4.3 `companies` — `/api/company`, `/api/companies`

| Entidad | Servicios |
|---------|-----------|
| `Company` | `CompaniesService` |

Configuración tenant: identidad, pagos, cheques, e-shop, métodos de pago, contacto público.

### 4.4 `branches` — `/api/branches`

| Entidad | Servicios |
|---------|-----------|
| `Branch` | `BranchesService` |

Sucursales por empresa.

### 4.5 `permissions` — `/api/permissions` ⚠️ huérfano

| Entidad | Servicios |
|---------|-----------|
| `Permission` | `PermissionsServiceAdapter` |

RBAC definido pero módulo **no importado** en `AppModule` (solo tests).

### 4.6 `health` — `/api/health`

| Entidad | Servicios |
|---------|-----------|
| `HealthMetric` | `HealthService` |

Health check y métricas básicas.

### 4.7 `audits` — `/api/audits`

| Entidad | Servicios |
|---------|-----------|
| `Audit` | `AuditsService` |

Consulta de auditoría de cambios.

### 4.8 `multimedia` — `/api/multimedia`

| Entidad | Servicios |
|---------|-----------|
| `MultimediaAsset`, `MultimediaLink` | `MultimediaServiceAdapter`, `MultimediaAssetPurgeService` |

Upload, enlaces y purge de assets (R2/local). Usado por productos, e-shop, gastos operativos.

### 4.9 `notifications` — `/api/notifications`

| Entidad | Servicios |
|---------|-----------|
| `Notification`, `NotificationDelivery`, `NotificationAudience`, `NotificationPreference`, `NotificationRetentionPolicy` | `NotificationPublisherService`, `NotificationInboxService`, `NotificationRetentionService`, `AudienceResolverService`, `StockAlertNotificationService`, `WsNotificationsTenantService` |

Bandeja, publicación, retención y alertas stock vía WebSocket.

### 4.10 `automation` — `/api/automation/rules`

| Entidad | Servicios |
|---------|-----------|
| `AutomationRule`, `AutomationAction` | `AutomationRulesService`, `AutomationEngine` |

Reglas post-evento (transacciones derivadas, acciones automáticas).

### 4.11 `analytics` — `/api/analytics`

| Servicios |
|-----------|
| `AnalyticsService`, `AnalyticsServiceAdapter` |

Dashboard analítico (ventas, clientes, stock). Registrado dinámicamente en `AppModule`.

---

## 5. Ventas y POS

### 5.1 `points-of-sale` — `/api/points-of-sale`

| Entidad | Servicios |
|---------|-----------|
| `PointOfSale` | `PosService` |

Configuración de terminales POS por sucursal.

### 5.2 `cash-sessions` — `/api/cash-sessions`

| Entidad | Servicios |
|---------|-----------|
| `CashSession` | `CashSessionCoreService`, `SalesFromSessionService`, `SessionInventoryService`, `CashSessionsServiceFacade`, `CashSessionIntegrityService`, `CashSessionsService` (legacy) |

**Flujo crítico:** apertura/cierre de caja; venta atómica al cobrar (`SalesFromSessionService`); arqueo e integridad; payout de notas de crédito cliente.

Endpoints clave: ventas desde sesión, movimientos, cierre, traslado a cash hub.

### 5.3 `cash-hubs` — `/api/cash-hubs`

| Entidad | Servicios |
|---------|-----------|
| `CashHub` | `CashHubsService` |

Centros de acopio de efectivo (tesorería física).

### 5.4 `customers` — `/api/customers`

| Entidad | Servicios |
|---------|-----------|
| `Customer` | `CustomersService`, `CustomersServiceAdapter`, `CustomerPaymentSourcesService` |

Clientes, crédito, cuentas bancarias, fuentes de pago.

### 5.5 `payments` — `/api/payments`

| Servicios |
|-----------|
| `PaymentsService`, `PaymentsServiceAdapter` |

Pagos de clientes y conciliación con ledger.

### 5.6 `installments` — `/api/installments`, `/api/accounts-receivable`

| Entidad | Servicios |
|---------|-----------|
| `Installment` | `InstallmentService` |

Cuotas y cuentas por cobrar.

### 5.7 `quotations` — `/api/quotations`

| Servicios |
|-----------|
| `QuotationsService` |

Cotizaciones; conversión a venta.

### 5.8 `promotions` — `/api/promotions`, `/api/pos/me/promotions`

| Entidad | Servicios |
|---------|-----------|
| `Promotion`, `PromotionScope*`, `PromotionRedemption` | `PromotionsService` |

Promociones con alcance por sucursal, POS, producto, categoría, cliente, medio de pago.

### 5.9 `orders` — `/api/orders`, `/api/service-orders`, `/api/production-batches`, `/api/execution`

| Use cases |
|-----------|
| `CompleteServiceOrderUseCase`, `CompleteProductionBatchUseCase` |

Órdenes de servicio, lotes de producción, ejecución operativa.

### 5.10 `checks` — `/api/checks`

| Entidad | Servicios |
|---------|-----------|
| `Check`, `CheckTransactionLink`, `CheckEvent` | `ChecksService`, `ChecksReconciliationService`, `CheckPaymentObligationService`, `CheckLedgerService` |

Cheques recibidos/emitidos, obligaciones y conciliación.

---

## 6. Compras y proveedores

Los módulos DTE son **wrappers** sobre `TransactionsModule`; la lógica pesada vive en `SupplierFiscalDocumentCreateService` y handlers de transacciones.

| Módulo | Ruta | Rol |
|--------|------|-----|
| `suppliers` | `/api/suppliers` | Maestro proveedores (`SuppliersService`) |
| `receptions` | `/api/receptions` | Recepción física (`ReceptionsService`, `Reception`, `ReceptionLine`) |
| `supplier-invoices` | `/api/supplier-invoices` | Facturas proveedor |
| `supplier-receipts` | `/api/supplier-receipts` | Boletas proveedor |
| `supplier-honorarium-receipts` | `/api/supplier-honorarium-receipts` | Honorarios |
| `supplier-guides` | `/api/supplier-guides` | Guías de despacho |
| `purchasing-supplier-documents` | `/api/supplier-credit-notes`, `/api/purchase-returns` | NC proveedor y devoluciones de compra |

Entidad transversal: `Supplier` (+ cuentas bancarias en metadata/person).

---

## 7. Inventario y catálogo

| Módulo | Ruta | Entidad principal | Servicios clave |
|--------|------|-------------------|-----------------|
| `products` | `/api/products` | `Product` | `ProductsService`, `ProductsPosService`, `ProductEshopVisibilitySyncService` |
| `product-variants` | `/api/product-variants` | `ProductVariant` | `ProductVariantsService`, `VariantQuantityConversionService` |
| `categories` | `/api/categories` | `Category` | `CategoryService` |
| `brands` | `/api/brands` | `Brand` | `BrandsService` |
| `attributes` | `/api/attributes` | `Attribute` | `AttributesService` |
| `units` | `/api/units` | `Unit` | `UnitsService` |
| `storages` | `/api/storages` | `Storage` | `StoragesService` |
| `inventory` | `/api/inventory` | — | `InventoryService` — consultas y ajustes |
| `stock-levels` | `/api/stock-levels` | `StockLevel` | `StockCommitmentService`, `StockLevelsServiceAdapter` |
| `stock-realtime` | _(WebSocket)_ | — | `WsStockTenantService`, `StockThresholdSweepService`, `StockRealtimePublisher` |
| `recipes` | `/api/recipes` | `Recipe`, `RecipeLine` | `RecipesService` — BOM / producción |
| `price-lists` | `/api/price-lists` | `PriceList` | `PriceListsService` |
| `price-list-items` | `/api/price-list-items` | `PriceListItem` | `PriceListItemsServiceAdapter` |
| `metal-prices` | `/api/metal-prices` | `MetalPrice` | `MetalPricesService` — joyería/industria |

**Nota:** movimientos de stock por transacción también pasan por `transactions` (`inventory-transactions` + handlers CQRS de inventario).

---

## 8. Tesorería y bancos

| Módulo | Ruta | Entidad | Servicio |
|--------|------|---------|----------|
| `treasury-accounts` | `/api/treasury-accounts` | `TreasuryAccount` | `TreasuryAccountsService` |
| `bank-accounts` | `/api/bank-accounts` | `BankAccount` | `BankAccountsService` |
| `bank-movements` | `/api/bank-movements` | `BankMovement` | `BankMovementsService` |
| `bank-transfers` | `/api/bank-transfers` | `BankTransfer` | `BankTransfersService` |
| `bank-withdrawals` | `/api/bank-withdrawals` | `BankWithdrawal` | `BankWithdrawalsService` |
| `cash-deposits` | `/api/cash-deposits` | `CashDeposit` | `CashDepositsService` |
| `petty-cash-withdrawals` | `/api/petty-cash-withdrawals` | — | `PettyCashWithdrawalsService` |
| `capital-contributions` | `/api/capital-contributions` | `CapitalContribution` | `CapitalContributionsService` |
| `operational-expenses` | `/api/operating-expenses` | `OperationalExpense` | `OperationalExpensesService` |
| `expense-categories` | `/api/expense-categories` | `ExpenseCategory` | `ExpenseCategoriesService` |

### Gastos operativos (`operational-expenses`)

Orquesta registro de negocio + transacciones:

- **Documento fiscal** (`SUPPLIER_INVOICE` / `RECEIPT` / `HONORARIUM`) → delega en `SupplierFiscalDocumentCreateService`.
- **Tipo OTHER** → `OperatingExpensePaymentPlanService` crea `OPERATING_EXPENSE` + hijos `EXPENSE_PAYMENT`.
- Sincroniza `paymentStatus` vía `ParentPaymentAggregateService`.

**Separado de nómina:** no crea ni enlaza liquidaciones `PAYROLL`.

---

## 9. Contabilidad

| Módulo | Ruta | Entidad | Servicio |
|--------|------|---------|----------|
| `accounting` | `/api/accounting` | — | `AccountingService` — jerarquía, libro mayor |
| `accounting-accounts` | `/api/accounting-accounts` | `AccountingAccount` | `AccountingAccountsServiceAdapter` |
| `accounting-rules` | `/api/accounting/rules` | `AccountingRule`, `AccountingRuleLine` | `AccountingRulesService` |
| `accounting-periods` | `/api/accounting/periods` | `AccountingPeriod` | `AccountingPeriodsService` |
| `account-balances` | `/api/account-balances` | `AccountBalance` | `AccountBalanceService` |
| `ledger-entries` | `/api/ledger-entries` | `LedgerEntry` | `LedgerEntriesService` |
| `taxes` | `/api/taxes` | `Tax` | `TaxesService` |
| `result-centers` | `/api/result-centers` | `ResultCenter` | `ResultCentersService` |

### Generación de asientos

1. Transacción confirmada → evento / listener.
2. `AccountingEngine` aplica reglas de `accounting-rules` (prioridad, tipo, categoría gasto, impuesto, medio de pago).
3. **Casos especiales hardcoded:**
   - `PAYROLL` → `LedgerEntriesService.generatePayrollEntries()` (por línea haber/descuento).
   - `PAYMENT_EXECUTION` → asientos según tipo de obligación pagada.

### Módulos contables huérfanos ⚠️

| Módulo | Ruta | Estado |
|--------|------|--------|
| `accounting-period-snapshots` | `/api/accounting-period-snapshots` | No en `AppModule` |
| `budgets` | `/api/budgets` | No en `AppModule` |
| `transaction-lines` | `/api/transaction-lines` | No en `AppModule`; entidad activa vía `transactions` |

---

## 10. RRHH

| Módulo | Ruta | Entidad | Servicio |
|--------|------|---------|----------|
| `persons` | `/api/persons` | `Person` | `PersonsService` — base personas naturales |
| `employees` | `/api/employees` | `Employee` | `EmployeesService` |
| `remunerations` | `/api/remunerations` | `Remuneration` | `RemunerationsService` |
| `organizational-units` | `/api/organizational-units` | `OrganizationalUnit` | `OrganizationalUnitsService` |
| `shareholders` | `/api/shareholders` | `Shareholder` | `ShareholdersService` |

### Nómina (`remunerations`)

| Servicio | Rol |
|----------|-----|
| `RemunerationsService` | Crea liquidación → `PAYROLL` + hijos `PAYROLL_PAYMENT` según plan |

Flujo: líneas haber/descuento en metadata → `taxAmount = 0` → lane AP `PAYROLL_PAYMENT` → contabilidad dedicada en ledger.

---

## 11. eShop

### `e-shop` — `/api/e-shop`, `/api/e-shop/admin`

| Entidad | Servicios |
|---------|-----------|
| `EShopHeroSlide`, `EShopTestimonial` | `EShopService` |

| Controller | Rol |
|------------|-----|
| `EShopPublicController` | Catálogo público, checkout, config tienda (sin auth ERP) |
| `EShopAdminController` | Hero, testimonios, productos destacados, envíos |

Depende de: `products`, `companies`, `multimedia`, `transactions` (venta eShop), `stock-levels`.

---

## 12. Helpers sin módulo REST

### `payment-methods-config`

Solo helpers y tipos (`payment-method-config.helpers.ts`) usados por `companies` para configurar medios de pago. Sin controller ni module propio.

---

## 13. Mapa de dependencias (simplificado)

```
                    ┌─────────────┐
                    │  companies  │
                    │   branches  │
                    │    users    │
                    └──────┬──────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
   ┌───────────┐    ┌─────────────┐   ┌──────────┐
   │ products  │    │ transactions │◄──│ receipts │
   │ inventory │◄───│  (hub)       │   │ suppliers│
   │ stock     │    └──────┬───────┘   │ op.expen.│
   └───────────┘           │           │ remuner. │
                           ▼           └──────────┘
                    ┌─────────────┐
                    │ledger-entries│
                    │accounting-  │
                    │   rules     │
                    └─────────────┘
```

**Regla práctica:** antes de crear lógica comercial nueva, evaluar si corresponde un nuevo `TransactionType` o extender metadata de uno existente.

---

## 14. Índice rápido de rutas REST

Prefijo común: `/api/{ruta}`.

| Área | Rutas |
|------|-------|
| Auth | `auth`, `users` |
| Plataforma | `health`, `audits`, `multimedia`, `notifications`, `analytics`, `automation/rules` |
| Empresa | `company`, `companies`, `branches` |
| Ventas | `points-of-sale`, `cash-sessions`, `cash-hubs`, `customers`, `payments`, `installments`, `accounts-receivable`, `quotations`, `promotions`, `pos/me/promotions`, `transactions`, `accounts-payable`, `supplier-payments`, `checks` |
| Compras | `suppliers`, `receptions`, `supplier-invoices`, `supplier-receipts`, `supplier-honorarium-receipts`, `supplier-guides`, `supplier-credit-notes`, `purchase-returns`, `purchase-orders` |
| Inventario | `products`, `product-variants`, `categories`, `brands`, `attributes`, `units`, `storages`, `inventory`, `stock-levels`, `inventory-transactions`, `recipes`, `price-lists`, `price-list-items`, `metal-prices` |
| Tesorería | `treasury-accounts`, `bank-accounts`, `bank-movements`, `bank-transfers`, `bank-withdrawals`, `cash-deposits`, `petty-cash-withdrawals`, `capital-contributions`, `operating-expenses`, `operating-expense-transactions`, `expense-categories` |
| Contabilidad | `accounting`, `accounting-accounts`, `accounting/rules`, `accounting/periods`, `account-balances`, `ledger-entries`, `taxes`, `result-centers` |
| RRHH | `persons`, `employees`, `remunerations`, `organizational-units`, `shareholders` |
| eShop | `e-shop`, `e-shop/admin` |
| Órdenes | `orders`, `service-orders`, `production-batches`, `execution` |
| Observabilidad | `metrics` |

---

## 15. Módulos huérfanos (acción pendiente)

Estos módulos tienen código pero **no están activos** en producción al no importarse en `AppModule`:

| Módulo | Impacto |
|--------|---------|
| `permissions` | API RBAC inaccesible |
| `budgets` | Presupuestos inaccesibles |
| `accounting-period-snapshots` | Snapshots de período inaccesibles |
| `transaction-lines` | REST de líneas inactivo; entidad sí usada por `transactions` |

Para activarlos: agregar el `*Module` correspondiente a `app.module.ts` y verificar migraciones.

---

## 16. Documentación relacionada

| Documento | Contenido |
|-----------|-----------|
| [ARQUITECTURA_Y_ECOSISTEMA.md](./ARQUITECTURA_Y_ECOSISTEMA.md) | Visión full-stack y flujos de negocio |
| [legacy/BACKEND_ARQUITECTURA.md](../legacy/BACKEND_ARQUITECTURA.md) | Patrones CQRS/DDD, cómo extender módulos |
| [legacy/BACKEND_INSTRUCTIONS.md](../legacy/BACKEND_INSTRUCTIONS.md) | Reglas para agentes |
| [legacy/CUENTAS_POR_PAGAR_MODELO.md](../legacy/CUENTAS_POR_PAGAR_MODELO.md) | Modelo AP |
| `backend/docs/SALE_TRANSACTION_FLOW.md` | Flujo de venta (si existe en repo) |

---

*Al agregar un módulo nuevo: registrar en `app.module.ts`, documentar aquí la ruta, entidades y servicios exportados, y crear migración TypeORM si hay cambio de esquema.*
