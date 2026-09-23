# 04 — API Core Lite (HTTP)

Base: `http://127.0.0.1:{CORE_PORT}/api`  
Auth: `Authorization: Bearer <jwt>`  
Tenant: single company; header/context Lite sin selector.

Solo endpoints **consumidos por Lite**. El Core puede tener más rutas; Lite no las llama.

## Auth / users

| Method | Path | Usado por | Función cliente |
|--------|------|-----------|-----------------|
| POST | `/auth/login` | Admin/POS login | `authApi.login` |
| POST | `/auth/refresh` | providers | `authApi.refresh` |
| GET | `/users/me` | shell | `usersApi.me` |
| GET | `/users` | settings users | `usersApi.list` |
| POST | `/users` | settings | `usersApi.create` |
| PATCH | `/users/:id` | settings | `usersApi.update` |
| GET/PATCH | memberships/roles | settings | `usersApi.setRoles` |

## Company / branches / POS

| Method | Path | Cliente |
|--------|------|---------|
| GET/PATCH | `/companies/current` | `companyApi` |
| GET/POST/PATCH | `/branches` | `branchesApi` |
| GET/POST/PATCH | `/points-of-sale` | `pointsOfSaleApi` |
| GET/POST | `/cash-sessions` | `cashSessionsApi` |
| POST | `/cash-sessions/:id/close` | `cashSessionsApi.close` |

## Catalog / inventory

| Method | Path | Cliente |
|--------|------|---------|
| CRUD | `/products`, `/product-variants` | `productsApi`, `variantsApi` |
| CRUD | `/categories`, `/brands`, `/attributes` | … |
| CRUD | `/units`, `/storages` | … |
| GET/PATCH | `/stock-levels` | `stockApi` |
| CRUD | `/price-lists`, `/price-list-items` | `priceListsApi` |

## Sales

| Method | Path | Cliente |
|--------|------|---------|
| GET | `/transactions?type=SALE` | `salesApi.list` |
| POST | `/transactions` (SALE) | `salesApi.create` / `posSaleApi.charge` |
| GET | `/transactions/:id` | `salesApi.get` |
| POST | PAYMENT_IN / crédito | `paymentsApi` |
| CRUD | quotations | `quotationsApi` |
| CRUD | `/customers` | `customersApi` |
| CRUD | `/promotions` | `promotionsApi` |

## Purchasing

| Method | Path | Cliente |
|--------|------|---------|
| CRUD | `/suppliers` | `suppliersApi` |
| POST | receptions | `receptionsApi.create` |
| GET | receptions | `receptionsApi.list` |
| POST | supplier payments (caja) | `apApi` / payments |

## Accounting lite

| Method | Path | Cliente |
|--------|------|---------|
| CRUD | `/taxes` | `taxesApi` |
| GET | AR / AP aggregates | `arApi`, `apApi` |

## Health / seed

| Method | Path | Cliente |
|--------|------|---------|
| GET | `/health` | `useCoreHealth` |
| POST | `/lite/seed` (nuevo) | `seedApi.runMinimal` — solo edición Lite |

## No llamar desde Lite

Cualquier `/sii/*`, `/hcm/*`, `/dining/*`, `/e-shop/*`, `/delivery/*`, `/laundry/*`, treasury bank/OE, analytics avanzado.
