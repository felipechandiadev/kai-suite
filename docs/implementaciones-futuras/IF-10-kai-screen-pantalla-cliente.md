# IF-10 · Kai Screen — pantalla cliente en Android POS

| Campo | Valor |
|-------|-------|
| **ID** | IF-10 |
| **Estado** | Implementado (MVP junio 2026) |
| **Prioridad** | P1 |
| **Última revisión** | junio 2026 |

---

## 1. Resumen

**Kai Screen** es la app Android nativa que muestra el carrito de compra al cliente en la **segunda pantalla** de tablets dual-screen (Sunmi, iMin, PAX). El POS (`pwa-pos` en Chrome) publica snapshots del carrito vía **WebSocket local**; Kai Screen renderiza la UI en `Presentation` API.

| Componente | Rol |
|------------|-----|
| `packages/customer-display-client` | Protocolo v1.0 + cliente WS para el POS |
| `kai-screen-android` | Servidor WS + UI cliente en pantalla secundaria |
| `pwa-pos` | Publica carrito; ajustes en Impresión local |

**MVP:** misma tablet (`127.0.0.1`), total final sin desglose de descuentos al cliente.

---

## 2. Protocolo WebSocket v1.0

Puertos por defecto (no colisionan con Kai Printers `14567/14568`):

| Modo | Puerto |
|------|--------|
| WS | 14570 |
| WSS | 14571 |

| Acción | Dirección | Descripción |
|--------|-----------|-------------|
| `hello` | POS → Screen | `clientId`, `pointOfSaleId`, `storeName`, `token` opcional |
| `cart_snapshot` | POS → Screen | Estado del carrito |
| `display_event` | POS → Screen | `sale_completed`, `idle` |
| `display_status` | Screen → POS (evento) | `connected`, `displayAttached` |

---

## 3. Modelo `CustomerDisplaySnapshot`

Fuente: `packages/customer-display-client/src/display-snapshot.ts`.

Estados UI: `idle`, `active_sale`, `thank_you`.

El POS calcula totales en `build-customer-display-snapshot.ts` (misma fórmula que `PosWorkspace`).

---

## 4. Instalación

Ver [INSTALACION_KAI_SCREEN_ANDROID.md](../../pwa-pos/public/downloads/INSTALACION_KAI_SCREEN_ANDROID.md).

---

## 5. Criterios de aceptación MVP

1. Tablet dual-screen: cliente ve líneas y total al agregar productos.
2. Tras venta: pantalla `thank_you` 5 s → `idle`.
3. POS funciona con Kai Screen apagado.
4. Tests en `customer-display-client` y CI `kai-screen-android.yml`.

---

## 6. Extensiones post-MVP

- LAN entre tablets
- Relay cloud (Socket.IO)
- Logo empresa, imágenes de producto
- Pantalla durante cobro / datáfono

[← IF-01](./IF-01-kai-printers-android-nativo.md) · [Roadmap](./ROADMAP.md)
