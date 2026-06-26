# IF-13 — Sistema de preventa POS

## Resumen

Separa **armado de carrito** (punto PRESALE) del **cobro** (punto SALE/caja) mediante tickets persistidos en `presale_tickets`, sin transacción de venta en preventa.

## Configuración

1. **Empresa** — Ajustes → Preventa: habilitar módulo (`companies.settings.presales.enabled`).
2. **Admin** — Ventas → Puntos de venta:
   - Tipo **Preventa** (`PRESALE`): genera tickets, sin sesión de caja.
   - Tipo **Caja** (`SALE`) + switch **Acepta tickets de preventa**: escaneo y cobro.
3. **POS preventa** — `/session-setup`: elegir POS preventa → **Entrar a preventa** (sin abrir caja).
4. **POS caja** — Flujo normal con sesión; escanear código alfanumérico en buscador.

## API

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/presale-tickets` | Crear ticket desde carrito |
| GET | `/api/presale-tickets/by-code/:code?pointOfSaleId=` | Lookup en caja |
| POST | `/api/presale-tickets/:id/cancel` | Cancelar ticket READY |
| GET | `/api/company/presale-settings` | Feature flag empresa |

## Venta con redención

`POST /api/cash-sessions/sales` acepta `fulfillPresaleTicketId`. Al confirmar, el ticket pasa a `REDEEMED` y se vincula a la transacción SALE.

## Reglas de negocio

- Código único alfanumérico (18 chars), sin guiones.
- Cobro solo en **misma sucursal** que el punto de preventa.
- Sin movimiento de stock en preventa; stock se valida al cobrar en caja.
- Sin sesión de caja en preventa.

## Impresión

- Tipo `pos-presale-ticket` en `print-service-client` (agente KaiPrinters pendiente de soporte nativo).
- Fallback HTML en POS (`presale-ticket-print.ts`) con código grande y diálogo de confirmación.

## Migración

`1756560000000-PresaleTickets.ts` — tablas `presale_tickets`, `presale_ticket_lines`.

## Prueba manual

1. Habilitar preventa en empresa.
2. Crear POS PRESALE y POS SALE (misma sucursal, caja con flag).
3. Preventa: armar carrito → **Generar ticket** → imprimir código.
4. Caja: escanear código → cobrar → ticket no reutilizable.
