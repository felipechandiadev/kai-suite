# 02 — Rutas POS Lite

Prefijo UI: `/pos`. Paridad con `kai-pos` (sin laundry / Food / hub bank pesado).

## IN

| Ruta Lite | Ref. kai-pos | Page | Objetivo |
|-----------|--------------|------|----------|
| `/pos/login` | `(pos)/login` | `LoginPage` | Auth cajero |
| `/pos/opening` | `(setup)/opening` | `OpeningPage` | Apertura caja (monto) |
| `/pos/session-setup` | `(setup)/session-setup` | `SessionSetupPage` | Elegir POS / validar sesión |
| `/pos` | `(pos)/pos` | `PosSellPage` | Venta mostrador (PHYSICAL/SERVICE/PACK) |
| `/pos/payment` | `(pos)/pos/payment` | `PaymentPage` | Cobro efectivo/débito/crédito/transfer |
| `/pos/credit-payment` | `(pos)/pos/credit-payment` | `CreditPaymentPage` | Pago a cuenta / crédito interno |
| `/pos/customers` | `(pos)/customers` | `CustomersPage` | Buscar/crear cliente rápido |
| `/pos/cash/closing` | `(pos)/cash/closing` | `ClosingPage` | Cierre de caja |
| `/pos/cash/closing/result` | `(pos)/cash/closing/result` | `ClosingResultPage` | Resultado / ticket cierre |
| `/pos/cash/movements` | `(pos)/cash/movements` | `MovementsPage` | Movimientos de sesión |
| `/pos/purchasing/receptions/new` | `(pos)/purchasing/receptions/new` | `NewReceptionPage` | Recepción rápida desde POS |
| `/pos/settings` | `(pos)/settings` | `PosSettingsPage` | Ajustes locales POS |
| `/pos/settings/about` | `(pos)/settings/about` | `AboutPage` | Versión |

## OUT (suite POS, no Lite)

| Ruta suite | Motivo |
|------------|--------|
| `/laundry/*` | Lavandería fuera |
| `/accounts` (dining) | Food fuera |
| `/cash/hub-deposit` / `hub-withdrawal` | Tesorería solo caja; hubs bancarios OUT |
| `/settings/kai-board` | Board fuera |
| `/settings/customer-display` | Opcional post-v1 |
| `/settings/local-printing` | Sección Impresoras de la app |

## Flujos obligatorios (paridad)

1. Login → session-setup → opening → `/pos` (carrito).  
2. Cobrar → `/pos/payment` → ticket `invoke` `print_sale_ticket`.  
3. Crédito interno → líneas + `/pos/credit-payment` o medio INTERNAL_CREDIT en payment.  
4. Cierre → `/pos/cash/closing` → ticket cierre.  
5. Recepción → `/pos/purchasing/receptions/new` → stock ↑.

## Estado preservado

`section-state.store` guarda carrito + `sessionId` al cambiar a Admin/Impresoras y restaurar al volver a POS.
