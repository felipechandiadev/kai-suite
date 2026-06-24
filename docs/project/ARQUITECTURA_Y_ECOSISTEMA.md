# KaiStore / Flow Store 2 — Arquitectura, ecosistema y proyecto

Documento maestro del monorepo **flow-store-2**. Describe qué es el producto, cómo se organizan las aplicaciones, cómo se comunican entre sí y qué principios arquitectónicos rigen el backend y los frontends.

**Última revisión:** junio 2026  
**Audiencia:** desarrolladores, agentes de IA, producto técnico.

---

## 1. Qué es el proyecto

**Flow Store 2** (marca comercial **KaiStore**) es un ERP/POS multi-empresa orientado a retail chileno: catálogo, inventario, ventas en mostrador, compras con DTE proveedor, tesorería, contabilidad, RRHH (liquidaciones) y tienda pública (eShop).

El mismo código base puede desplegarse en dos **modalidades de producto**:

| Modalidad | Enfoque | Estado |
|-----------|---------|--------|
| **KaiStore** | Retail / ERP clásico | Activo, camino principal |
| **KaiFood** | Gastronomía (mesas, comandas, cocina) | Planificado vía `NEXT_PUBLIC_KAI_PRODUCT_MODE=kaifood` |

Cada despliegue de una PWA corresponde a **una empresa / una tienda** (multi-tenant en backend, single-tenant por instancia de frontend en eShop).

---

## 2. Mapa del ecosistema

```
                         ┌─────────────────────────────────────┐
                         │           PostgreSQL                 │
                         │     (datos + migraciones TypeORM)    │
                         └─────────────────┬───────────────────┘
                                           │
                         ┌─────────────────▼───────────────────┐
                         │     backend (NestJS) :3030          │
                         │  CQRS/DDD · REST /api · multi-tenant│
                         └─────────────────┬───────────────────┘
           ┌──────────────┬───────────────┼───────────────┬──────────────┐
           │              │               │               │              │
    ┌──────▼──────┐ ┌─────▼─────┐  ┌──────▼──────┐ ┌─────▼─────┐ ┌──────▼──────┐
    │ pwa-admin   │ │ pwa-pos   │  │ pwa-stock   │ │ pwa-eshop │ │print-service│
    │   :4031     │ │   :4032   │  │   :4033     │ │   :4034   │ │   (Tauri)   │
    │ ERP web     │ │ Caja POS  │  │ Inventario  │ │ Tienda    │ │ Impresión   │
    │ backoffice  │ │ mostrador │  │ móvil/tablet│ │ pública   │ │ local ESC/PDF│
    └─────────────┘ └───────────┘  └─────────────┘ └───────────┘ └─────────────┘
           │              │               │               │
           └──────────────┴───────────────┴───────────────┘
                    Server Actions / fetch → /api/*
                    JWT (NextAuth) en apps autenticadas
```

### Aplicaciones y puertos

| App | Puerto dev | Rol | Autenticación |
|-----|------------|-----|---------------|
| `backend` | **3030** | API REST, negocio, contabilidad, transacciones | JWT Bearer |
| `pwa-admin` | **4031** | Panel ERP: ventas, compras, inventario, tesorería, contabilidad, RRHH, config eShop | NextAuth → JWT |
| `pwa-pos` | **4032** | Punto de venta mostrador, sesiones de caja, venta atómica al cobrar | NextAuth → JWT |
| `pwa-stock` | **4033** | Operaciones de inventario / existencias en piso | NextAuth → JWT |
| `pwa-eshop` | **4034** | Catálogo público, carrito, checkout (sin pasarela online en MVP) | Público + API e-shop |
| `print-service` | local | Agente de impresión térmica/PDF (Tauri), tickets POS | WebSocket / HTTP local |

### Agentes locales — puertos WebSocket

| Agente | WS | WSS | Cliente npm |
|--------|-----|-----|-------------|
| Kai Printers (`print-service`) | 14567 | 14568 | `print-service-client` |
| Kai Screen (`kai-screen-android`) | 14570 | 14571 | `customer-display-client` |

### Paquetes compartidos (`packages/`)

| Paquete | Uso |
|---------|-----|
| `document-print` | Contratos y utilidades de impresión de documentos |
| `print-service-client` | Cliente para hablar con el agente `print-service` desde PWAs |
| `customer-display-client` | Cliente WS pantalla cliente (Kai Screen) |
| `scale-service-client` | Cliente Web Serial para balanza USB en pwa-admin (joyería) |

### Otros directorios relevantes

| Directorio | Propósito |
|------------|-----------|
| `.instructions/` | Reglas para agentes Copilot/Cursor (backend y webadmin) |
| `docs/project/` | Documentación viva del proyecto (este archivo) |
| `docs/legacy/` | Documentación histórica, guías detalladas y análisis |
| `backend/src/seed/` | Datos de desarrollo (`npm run seed`) |
| `data-to-seed/` | Scripts y JSON para seeds de catálogo |
| `shared/` | Utilidades mínimas compartidas entre apps (p. ej. orígenes LAN dev) |

---

## 3. Dominios de negocio (backend)

El backend organiza el negocio en **módulos** bajo `backend/src/modules/`. Cada módulo sigue capas `domain → application → infrastructure → presentation`.

### 3.1 Núcleo transaccional

El corazón del sistema es el módulo **`transactions`**: casi toda operación económica es una **transacción** tipada (`TransactionType`) con hijos de pago, metadata y reglas contables.

Tipos principales:

| Familia | Ejemplos | Uso |
|---------|----------|-----|
| **Ventas** | `SALE`, pagos de cliente | POS, eShop |
| **Compras / DTE** | `SUPPLIER_INVOICE`, `SUPPLIER_RECEIPT`, `SUPPLIER_HONORARIUM_RECEIPT`, `RECEPTION` | Compras con documento tributario |
| **Pagos salientes** | `SUPPLIER_PAYMENT`, `EXPENSE_PAYMENT`, `PAYROLL_PAYMENT` | Cuentas por pagar (borradores → confirmados) |
| **Gastos** | `OPERATING_EXPENSE` | Gastos operativos sin DTE fiscal (tipo «Otro») |
| **Nómina** | `PAYROLL` | Liquidaciones de sueldo (**separado** de gastos operativos) |
| **Tesorería** | `PAYMENT_EXECUTION`, transferencias, depósitos | Ejecución real de pagos y movimiento caja/banco |
| **Contabilidad** | Asientos vía `ledger-entries` + `accounting-rules` | Motor contable automático |

**Principio de cuentas por pagar:** cada obligación pendiente es un hijo `*_PAYMENT` en estado `DRAFT`. Al confirmar el pago se actualiza el hijo y se genera `PAYMENT_EXECUTION`. Ver `docs/legacy/CUENTAS_POR_PAGAR_MODELO.md`.

### 3.2 Mapa funcional por área

| Área ERP | Módulos backend (representativos) | App principal |
|----------|-----------------------------------|---------------|
| **Ventas** | `transactions`, `customers`, `cash-sessions`, `points-of-sale`, `price-lists`, `promotions`, `quotations` | `pwa-admin`, `pwa-pos` |
| **Compras** | `receptions`, `suppliers`, `supplier-invoices`, `supplier-receipts`, `supplier-honorarium-receipts`, `purchasing-supplier-documents` | `pwa-admin` |
| **Inventario** | `products`, `product-variants`, `inventory`, `stock-levels`, `storages`, `categories`, `brands`, `units` | `pwa-admin`, `pwa-stock` |
| **Tesorería** | `operational-expenses`, `expense-categories`, `treasury-accounts`, `bank-accounts`, `bank-movements`, `checks`, `cash-hubs` | `pwa-admin` |
| **Contabilidad** | `accounting-accounts`, `accounting-rules`, `ledger-entries`, `accounting-periods`, `account-balances` | `pwa-admin` |
| **RRHH** | `employees`, `remunerations`, `organizational-units`, `result-centers` | `pwa-admin` |
| **eShop** | `e-shop`, `companies` (config pública), `multimedia` | `pwa-eshop`, `pwa-admin` (config) |
| **Plataforma** | `auth`, `users`, `companies`, `branches`, `permissions`, `health`, `audits` | Todas las autenticadas |

### 3.3 Gastos operativos vs nómina (decisión de producto)

Son **pipelines separados**:

- **Gastos operativos** (`operational_expenses` + transacciones `OPERATING_EXPENSE` o DTE proveedor): proveedores, categorías de gasto, plan de pago, cuentas por pagar lane `EXPENSE_PAYMENT` / `SUPPLIER_PAYMENT`.
- **Nómina** (`PAYROLL` + `PAYROLL_PAYMENT`): liquidaciones por empleado, lane AP `PAYROLL`, contabilidad por líneas de haber/descuento.

No se crean gastos operativos automáticos desde liquidaciones.

---

## 4. Arquitectura del backend

### 4.1 Stack

| Tecnología | Uso |
|------------|-----|
| NestJS | HTTP, módulos, DI, guards, pipes |
| TypeORM | PostgreSQL, migraciones en `backend/src/migrations/` |
| @nestjs/cqrs | Commands / queries en módulos maduros |
| class-validator | DTOs |
| EventEmitter | Eventos de aplicación |
| Redis (opcional) | Caché |

### 4.2 Estructura global

```
backend/src/
├── main.ts
├── app.module.ts
├── config/           # env, TypeORM, data-source (CLI migraciones)
├── common/tenant/    # multi-empresa, guard global JWT + companyId
├── modules/{feature}/
│   ├── domain/
│   ├── application/
│   ├── infrastructure/
│   ├── presentation/
│   └── {feature}.module.ts
├── shared/           # AccountingEngine, enums, eventos, cache
├── migrations/
└── seed/
```

**Alias TypeScript:** `@modules/*`, `@shared/*`, `@common/*`.

### 4.3 Principios

1. **Controllers delgados** — validar HTTP y delegar; sin reglas de negocio.
2. **Multi-tenant** — casi todo dato lleva `companyId` de la sesión activa.
3. **CQRS híbrido** — módulos nuevos imitan el patrón del módulo vecino más cercano (`transactions`, `users` como referencia).
4. **Migraciones obligatorias** — cambios de esquema vía TypeORM migrations, no `synchronize` en producción.

Detalle extendido: `docs/legacy/BACKEND_ARQUITECTURA.md`.

---

## 5. Arquitectura de los frontends (PWAs)

Todas las PWAs admin/POS/stock usan **Next.js App Router** con el patrón **Server Actions Only**:

```
UI (components) → Server Actions (*.action.ts) → Use cases (*.usecase.ts)
    → Domain (Zod) → Infrastructure (*.request.ts, único fetch al backend)
```

### 5.1 Reglas críticas

- **Prohibido** `fetch` al backend desde componentes cliente o hooks.
- **Siempre** `Authorization: Bearer {token}` en infraestructura.
- Validaciones de negocio en **domain** (Zod); UI tonta.
- Patrón **Colección admin** para CRUD: ver `pwa-admin/AGENTS.md` y ejemplo `settings/branches`.

### 5.2 Estructura típica (`pwa-admin`)

```
pwa-admin/
├── app/(app)/              # Rutas ERP por sección
├── src/features/{feature}/ # actions, application, domain, infrastructure, types
├── src/shared/components/  # Design system interno
├── src/navigation/         # mainMenu.ts — menú lateral
└── app/api/                # BFF routes (proxy selectivo al backend)
```

### 5.3 pwa-eshop (tienda pública)

- Un deploy = una tienda (`NEXT_PUBLIC_ESHOP_*` / config empresa).
- Catálogo vía endpoints públicos `e-shop/*`.
- Comparte componentes/preview con admin (`admin-shared`, eshop-preview en admin).
- Checkout crea pedido (`CUSTOMER_ORDER` o `BACKORDER`) en backend; pasarela de pago online en backlog (fase posterior).
- **Portal cliente (planificado/en curso):** registro, login y área `/cuenta/*` (pedidos, encargos, pagos, deudas, perfil). Ver [IF-08](../implementaciones-futuras/IF-08-eshop-portal-y-encargos-unificados.md).
- **Encargos web:** deben usar el mismo pipeline que encargos POS (reserva, abono, liquidación). Ver IF-08 §E.
- **Tema visual:** plantillas de color por empresa (`eShopTemplateId` + tokens) vía API storefront; configuración en admin `/e-shop/appearance`. Topbar y footer editables en `/e-shop/topbar` y `/e-shop/footer`. Ver [IF-06](../implementaciones-futuras/IF-06-eshop-plantillas-y-tema.md) e [IF-07](../implementaciones-futuras/IF-07-eshop-topbar-footer.md).

Guía técnica: `docs/legacy/KAISTORE_E-SHOP_DEVELOPMENT_GUIDE.md`.

---

## 6. Flujos transaccionales clave

### 6.1 Venta POS

1. Cajero abre **sesión de caja** (`cash-sessions`).
2. Carrito local en POS hasta cobrar.
3. Al cobrar: **una venta atómica** (`POST /cash-sessions/sales`) — no editar líneas post-guardado; correcciones vía devolución / nota de crédito.
4. Backend crea `SALE` + pagos + asientos contables.

> **Hoy:** `pwa-pos` es **online-first** (cada operación requiere backend). **Planificado:** operación POS completa offline con sincronización idempotente → [IF-02](../implementaciones-futuras/IF-02-pos-offline-first.md). Cobro de cuotas en POS incompleto → [IF-05](../implementaciones-futuras/IF-05-pos-credito-clientes.md).

### 6.2 Compra con DTE proveedor

1. Recepción o factura proveedor en admin.
2. Transacción padre (`SUPPLIER_INVOICE`, etc.) + plan de pago.
3. Hijos `SUPPLIER_PAYMENT` en `DRAFT` → aparecen en **Cuentas por pagar**.
4. Confirmar pago → `PAYMENT_EXECUTION` + actualización estado padre.

> **Admin:** pantalla `/accounting/accounts-payable`. **POS:** pago desde caja planificado → [IF-04](../implementaciones-futuras/IF-04-pos-cuentas-por-pagar.md).

### 6.3 Gasto operativo

1. Registro en `operational_expenses` (categoría, proveedor, documento).
2. Según `documentKind`:
   - **Fiscal** (factura/boleta/honorarios) → DTE + `SUPPLIER_PAYMENT`
   - **Otro** → `OPERATING_EXPENSE` + `EXPENSE_PAYMENT`
3. Sincronización de `paymentStatus` en OE al recalcular pagos del padre.

### 6.4 Liquidación de sueldo

1. `RemunerationsService.createRemuneration()` → transacción `PAYROLL`.
2. Líneas de haber/descuento en metadata; `taxAmount = 0`.
3. Hijos `PAYROLL_PAYMENT` según plan (pendiente, parcial, programado, completado).
4. Contabilidad especial por línea en `ledger-entries` (no pasa por gastos operativos).

### 6.5 Iniciativas planificadas (POS y concurrencia)

| Tema | Documento | Notas |
|------|-----------|-------|
| POS offline completo | [IF-02](../implementaciones-futuras/IF-02-pos-offline-first.md) | Cola local, folios en servidor, multi-POS |
| Mensajería / colas servidor | [IF-03](../implementaciones-futuras/IF-03-mensajeria-eventos-ventas-stock.md) | Outbox F1; Kafka F3 pospuesto |
| CxP desde POS | [IF-04](../implementaciones-futuras/IF-04-pos-cuentas-por-pagar.md) | Backend listo; UI POS pendiente |
| Crédito y cobranza POS | [IF-05](../implementaciones-futuras/IF-05-pos-credito-clientes.md) | Cobro cuotas: brecha UI principal |

---

## 7. Contabilidad

- **Reglas contables** (`accounting-rules`): mapean `TransactionType` (+ opcional categoría de gasto, impuesto, medio de pago) a cuentas debe/haber.
- **Motor** (`AccountingEngine` + `ledger-entries`): genera asientos al confirmar transacciones.
- **Casos especiales codificados**: nómina (`PAYROLL`) y ejecución de pago (`PAYMENT_EXECUTION`) tienen lógica dedicada además de las reglas seed.
- **Períodos y balances**: módulos `accounting-periods`, `account-balances`, snapshots.

Pantallas admin: plan de cuentas, reglas, libros, cuentas por cobrar/pagar, impuestos.

---

## 8. Seguridad y multi-empresa

- Autenticación JWT vía módulo `auth`.
- Guard de tenant global: requests autenticados llevan contexto de **empresa activa** (`companyId`).
- Roles (`SUPER_ADMIN`, `ADMIN`, `OPERATOR`, …) filtran menú y endpoints.
- eShop público usa guards específicos en módulo `e-shop` (sin JWT de usuario ERP).

---

## 9. Datos y operaciones

### Desarrollo local

```bash
# Backend
cd backend && npm install && npm run start:dev    # :3030

# Admin
cd pwa-admin && npm install && npm run dev        # :4031

# POS / Stock / eShop (opcional)
cd pwa-pos && npm run dev                         # :4032
cd pwa-stock && npm run dev                       # :4033
cd pwa-eshop && npm run dev                       # :4034

# Seed
cd backend && npm run seed
```

### Migraciones

```bash
cd backend && npm run migration:run
```

Las migraciones viven en `backend/src/migrations/` y se registran en `config/data-source.ts`.

### Variables de entorno

- Backend: `backend/.env` — DB, JWT, Redis, etc.
- PWAs: `.env.local` por app — `BACKEND_API_URL`, NextAuth, `NEXT_PUBLIC_KAI_PRODUCT_MODE`, flags eShop.

Detalle frontend: `docs/legacy/WEBADMIN_FRONTEND_GUIDE.md`.

---

## 10. Impresión local

`print-service` es una app **Tauri** (Rust + frontend) que corre en la estación de caja:

- Recibe jobs de impresión desde POS/admin vía `print-service-client`.
- Soporta tickets ESC/POS, PDF (cierre caja, notas de crédito, etc.).
- Mapeo impresora ↔ tipo de documento configurable en admin (`/settings/local-printing`).

Guías: `docs/legacy/print_service_app_developer_guide_v2.md`.  
**Android nativo (planificado):** [IF-01](../implementaciones-futuras/IF-01-kai-printers-android-nativo.md).

### 10.1 Balanza serial (joyería)

Lectura de peso desde balanza USB en **pwa-admin** para la calculadora de precio por metal:

- Configuración: `/settings/scale` (localStorage `flowstore.admin.scale.v1`).
- Transporte: **Web Serial API** (Chrome/Edge en el mismo PC con la balanza USB).
- Ver [IF-11](../implementaciones-futuras/IF-11-kai-scale-balanza-serial.md).

---

## 11. Roadmap y documentación

| Necesidad | Dónde leer |
|-----------|------------|
| **Visión general** — ecosistema y flujos | `docs/project/ARQUITECTURA_Y_ECOSISTEMA.md` |
| **Backend** — módulos, servicios, rutas API | `docs/project/MODULOS_Y_SERVICIOS_BACKEND.md` |
| **Auditoría** — inconsistencias doc vs código | `docs/project/inconsistencias/README.md` (INC-01 … INC-17) |
| **Implementaciones futuras** — diseño y tareas | `docs/implementaciones-futuras/README.md`, [ROADMAP](../implementaciones-futuras/ROADMAP.md) |
| Roadmap producto P1–P6 | `docs/legacy/KAISTORE_ROADMAP.md` |
| Reglas agentes backend | `.instructions/backend.instruction`, `docs/legacy/BACKEND_INSTRUCTIONS.md` |
| Reglas agentes frontend | `.instructions/webadmin.instruction`, `docs/legacy/WEBADMIN_INSTRUCTIONS.md` |
| Arquitectura backend profunda | `docs/legacy/BACKEND_ARQUITECTURA.md` |
| Modelo cuentas por pagar | `docs/legacy/CUENTAS_POR_PAGAR_MODELO.md` |
| eShop | `docs/legacy/KAISTORE_E-SHOP_DEVELOPMENT_GUIDE.md` |
| SII / DTE (fase futura) | `docs/legacy/Definición Módulo SII KaiStore.md` |
| Análisis competitivo | `docs/legacy/ANALISIS_COMPETITIVO_BSALE_VS_KAISTORE.md` |

---

## 12. Decisiones arquitectónicas fijas

| Tema | Decisión |
|------|----------|
| POS — venta | Carrito local → venta **atómica** al cobrar |
| POS — editar venta guardada | **Fuera de alcance** |
| Post-venta | Devolución + nota de crédito |
| KaiStore vs KaiFood | Un deploy = una modalidad (`kaistore` \| `kaifood`) |
| Gastos operativos ↔ nómina | **Separados**, sin auto-creación cruzada |
| Frontend → backend | Server Actions only (admin/POS/stock) |
| Obligaciones de pago | Transacciones hijo `*_PAYMENT` DRAFT → confirmación |
| eShop checkout MVP | Crea venta; pasarela online en fase posterior |

---

## 13. Glosario breve

| Término | Significado |
|---------|-------------|
| **DTE** | Documento Tributario Electrónico (Chile) |
| **OE** | Gasto operativo (`operational_expenses`) |
| **AP / AR** | Cuentas por pagar / por cobrar |
| **Lane AP** | Familia de pagos: `SUPPLIER`, `PAYROLL`, `OPERATING_EXPENSE` |
| **Cash hub** | Punto de tesorería (caja/banco lógico) |
| **Result center** | Centro de resultado para imputación analítica |
| **PWA** | Progressive Web App (Next.js con soporte offline parcial) |

---

*Para contribuir: seguir `.instructions/` y las guías en `docs/legacy/`. Nuevos documentos de producto viven en `docs/project/`; material histórico o especificaciones largas van a `docs/legacy/`.*
