# IF-08 · eShop — portal cliente y encargos unificados

| Campo | Valor |
|-------|-------|
| **ID** | IF-08 |
| **Estado** | En curso |
| **Prioridad** | P1 |
| **Última revisión** | junio 2026 |
| **Tareas** | [ROADMAP.md § IF-08](./ROADMAP.md#if-08--eshop-portal-cliente-y-encargos-unificados) |

---

## 1. Resumen ejecutivo

El eShop público (`pwa-eshop`) hoy permite catálogo y checkout **sin cuenta de cliente**. Los pedidos crean `Person` + `Customer` por email, pero el comprador no puede ver historial, pagos ni deudas. Los encargos web (`BACKORDER` por falta de stock) **no pasan por el mismo pipeline operativo** que los encargos POS (reserva de inventario, abono, liquidación sincronizada).

**Objetivo IF-08:**

1. **Portal cliente** — registro, login, Mi cuenta (pedidos, encargos, pagos, deudas, perfil).
2. **Encargos unificados** — motor compartido POS + eShop con reserva, estados sincronizados y operación desde admin/POS.
3. **Pedidos con stock** (`CUSTOMER_ORDER`) — conversión a `SALE` y visibilidad en historial.

| Flujo | Antes | Después IF-08 F1 |
|-------|-------|------------------|
| Checkout guest | OK | OK + CTA crear cuenta |
| Encargo eShop | `BACKORDER` sin reserva | Mismo pipeline que POS |
| Liquidar encargo web | Solo por folio POS (frágil) | Reserva + sync estados |
| Panel cliente | No existe | `/cuenta/*` |
| Deudas / cuotas | Solo admin/POS | Portal si crédito habilitado |

---

## 2. Problema que resuelve

### 2.1 Cliente final

- Ver estado de pedidos y encargos sin llamar a la tienda.
- Consultar abonos, pagos y saldo a crédito (si aplica).
- Mantener datos de contacto actualizados.

### 2.2 Operación tienda

- Un solo modelo de encargo (`BACKORDER` + `INVENTORY_RESERVATION`).
- Liquidar encargos web en POS con paridad POS.
- Cerrar pedidos web con stock (`CUSTOMER_ORDER` → `SALE`).

---

## 3. Arquitectura

### 3.1 Identidad cliente (no usar `users` ERP)

Tabla `eshop_customer_accounts`:

- `company_id`, `customer_id`, `email` (unique por empresa)
- `password_hash`, `email_verified_at`

Auth: JWT scoped (`customerId` + `companyId`) vía `EShopCustomerGuard` bajo rutas `/e-shop/auth/*` y `/e-shop/me/*`.

### 3.2 Motor de encargos

`BackorderRegistrationService` — usado por:

- `SalesFromSessionService.createBackorder` (POS)
- `EShopCheckoutOrderService` cuando `ALLOW_BACKORDER` + shortage

Crea: `BACKORDER` + `metadata.backorder` + `INVENTORY_RESERVATION` + abono opcional (`PAYMENT_IN`).

### 3.3 Sincronización estados

`EShopBackorderSyncService` mantiene alineados:

- `metadata.backorder.reservationStatus` (comercial)
- `metadata.eShopOrder.fulfillmentStatus` (logístico)

Solo aplica si `metadata.source === 'e-shop'`.

### 3.4 Canal eShop vs POS

El checkout web es un **canal** (`metadata.source: 'e-shop'`), no un punto de venta. Perfil operativo en settings de empresa:

- `eShopDefaultBranchId` — sucursal del pedido/encargo
- `eShopDefaultStorageId` — stock catálogo y reservas (`INVENTORY_RESERVATION`)
- `eShopDefaultPriceListId` — precios web

**Admin:** Encargos y envíos → Configuración (sección *Operación de la tienda*). El almacén puede ser compartido con la vitrina física.

`pointOfSaleId` solo al liquidar en mostrador (`convert-to-sale`); no crear POS «eShop».

---

## 4. APIs portal (`/e-shop/me/*`)

| Endpoint | Descripción |
|----------|-------------|
| `GET /e-shop/me/summary` | Dashboard |
| `GET/PATCH /e-shop/me/profile` | Person + Customer |
| `GET /e-shop/me/orders` | Pedidos web del cliente |
| `GET /e-shop/me/orders/:id` | Detalle |
| `GET /e-shop/me/payments` | Pagos recibidos |
| `GET /e-shop/me/debts` | Cuotas + saldos (si crédito habilitado) |

Auth pública: `POST /e-shop/auth/register`, `login`, `verify-email`, `forgot-password`, `reset-password`.

---

## 5. UI `pwa-eshop`

| Ruta | Contenido |
|------|-----------|
| `/registro`, `/cuenta/login` | Auth |
| `/cuenta` | Resumen |
| `/cuenta/pedidos` | Lista unificada |
| `/cuenta/pedidos/[id]` | Detalle + timeline |
| `/cuenta/pagos` | Abonos |
| `/cuenta/deudas` | Cuotas / crédito |
| `/cuenta/perfil` | Datos personales |

---

## 6. Config admin

En `companies.settings` (eShop):

- `eShopCustomerPortalEnabled`
- `eShopRegistrationRequireRut`
- `eShopShowDebtsInPortal`

---

## 7. Fases de entrega

| Fase | Entregable |
|------|------------|
| **E1** | `BackorderRegistrationService` + refactor POS/eShop |
| **E2** | `EShopBackorderSyncService` |
| **E3** | Admin: liquidar POS, anular, abono manual |
| **E4** | `ConvertEshopCustomerOrderToSale` + `CUSTOMER_ORDER` en historial |
| **P0** | Auth cuenta + NextAuth eShop |
| **P1** | APIs `/e-shop/me/*` |
| **P2** | UI panel cliente |
| **P3** | Checkout autenticado |
| **P4** | Settings admin portal |

### Futuro (fuera F1)

- P5: Abono online (pasarela)
- P6: Magic link / OTP
- P7: Tracking guest por token en email

---

## 8. Criterios de aceptación (F1)

1. Encargo eShop con shortage crea `BACKORDER` con `INVENTORY_RESERVATION`.
2. Liquidar en POS → `FULFILLED` + `DELIVERED` (e-shop).
3. Anular encargo eShop libera reserva como POS.
4. Cliente registrado ve solo sus datos.
5. Deudas visibles si crédito habilitado y email verificado.
6. `CUSTOMER_ORDER` en historial y convertible a `SALE`.

---

## 9. Referencias

- `backend/src/modules/e-shop/application/eshop-checkout-order.service.ts`
- `backend/src/modules/cash-sessions/application/sales-from-session.service.ts`
- `backend/src/modules/transactions/domain/transaction-backorder.metadata.ts`
- `pwa-admin/app/(app)/e-shop/fulfillment/`
- `pwa-admin/app/(app)/sales/customers/ui/CustomerDetailDialog.tsx`
- [IF-05](./IF-05-pos-credito-clientes.md) — deudas en portal

[← Índice](./README.md) · [Roadmap IF-08](./ROADMAP.md#if-08--eshop-portal-cliente-y-encargos-unificados)
