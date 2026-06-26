# Roadmap — implementaciones futuras

Hoja de ruta para iniciativas documentadas en `docs/implementaciones-futuras/`. Complementa el [roadmap de producto](../legacy/KAISTORE_ROADMAP.md) (KaiStore/KaiFood); aquí el foco es **nuevos componentes o plataformas** aún no entregados.

**Última revisión:** junio 2026

---

## Cómo mantener este documento

1. **Nueva iniciativa:** crear `IF-XX-nombre.md`, añadir fila en [README](./README.md) y sección abajo con tareas.
2. **Nueva tarea:** usar ID `IF-XX.Tn`; describir entregable verificable; marcar dependencias.
3. **Avance:** cambiar estado de la tarea (`⬜` → `🔄` → `✅`); no borrar tareas completadas.
4. **Prioridad global:** columnas P0 (bloqueante) … P3 (nice-to-have).

---

## Resumen por implementación

| ID | Implementación | Prioridad | Fase actual | Estado global |
|----|----------------|-----------|-------------|---------------|
| IF-01 | [Kai Printers Android nativo](./IF-01-kai-printers-android-nativo.md) | P1 | F0 — Descubrimiento | Diseño |
| IF-02 | [POS offline-first](./IF-02-pos-offline-first.md) | P0 | F0 — Diseño | Diseño |
| IF-03 | [Mensajería y colas](./IF-03-mensajeria-eventos-ventas-stock.md) | P1 | F0 — Diseño | Diseño |
| IF-04 | [CxP en POS](./IF-04-pos-cuentas-por-pagar.md) | P2 | F0 — Diseño | Diseño |
| IF-05 | [Crédito clientes POS](./IF-05-pos-credito-clientes.md) | P1 | F0 — Diseño | Diseño |
| IF-06 | [eShop plantillas y tema](./IF-06-eshop-plantillas-y-tema.md) | P1 | F1 — Tokens | Hecho (F1) |
| IF-07 | [eShop topbar y footer](./IF-07-eshop-topbar-footer.md) | P1 | F1 — Shell | Hecho (F1) |
| IF-08 | [eShop portal cliente y encargos](./IF-08-eshop-portal-y-encargos-unificados.md) | P1 | E1 — Encargos | En curso |
| IF-09 | [Formatos impresión 58/80/carta/A4](./IF-09-formatos-impresion-58-80-carta-a4.md) | P1 | F0–F3 | Hecho |
| IF-10 | [Kai Screen pantalla cliente](./IF-10-kai-screen-pantalla-cliente.md) | P1 | MVP | Hecho |
| IF-11 | [Kai Scale balanza serial](./IF-11-kai-scale-balanza-serial.md) | P2 | MVP | Hecho |
| IF-12 | [Mercado Pago POS + eShop](./IF-12-mercado-pago-pos-y-eshop.md) | P1 | F1 — Backend | En curso |

### Orden de implementación sugerido

| Orden | IF | Razón |
|-------|-----|-------|
| 1 | IF-05 | Backend listo; brecha UI acotada (cobro cuotas) |
| 2 | IF-04 | Backend listo; nuevo módulo POS |
| 3 | IF-02 | Transversal; mayor esfuerzo |
| 4 | IF-03 F1 | Outbox cuando multi-POS / eShop presionen la DB |
| 5 | IF-08 E1–E2 | Encargos eShop = POS antes del portal cliente |
| — | IF-03 F3 Kafka | Pospuesto — no primordial |

---

## IF-08 · eShop — portal cliente y encargos unificados

**Objetivo:** panel Mi cuenta en `pwa-eshop` + pipeline único de encargos web/POS.

Ver [IF-08-eshop-portal-y-encargos-unificados.md](./IF-08-eshop-portal-y-encargos-unificados.md).

### E — Encargos unificados

| ID | Tarea | Prioridad | Estado | Notas |
|----|-------|-----------|--------|-------|
| IF-08.T1 | `BackorderRegistrationService` + refactor POS/eShop | P1 | 🔄 | Reserva inventario eShop |
| IF-08.T2 | `EShopBackorderSyncService` | P1 | ⬜ | Liquidación / anulación |
| IF-08.T3 | Admin encargo web (liquidar POS, anular, abono) | P1 | ⬜ | `EShopOrderDetailDialog` |
| IF-08.T4 | `ConvertEshopCustomerOrderToSale` + historial `CUSTOMER_ORDER` | P1 | ⬜ | |

### P — Portal cliente

| ID | Tarea | Prioridad | Estado | Notas |
|----|-------|-----------|--------|-------|
| IF-08.T10 | Migración `eshop_customer_accounts` + auth API | P1 | ⬜ | |
| IF-08.T11 | NextAuth `pwa-eshop` | P1 | ⬜ | |
| IF-08.T12 | APIs `/e-shop/me/*` | P1 | ⬜ | |
| IF-08.T13 | UI `/cuenta/*` | P1 | ⬜ | |
| IF-08.T14 | Checkout autenticado + CTA Mi cuenta | P2 | ⬜ | |
| IF-08.T15 | Settings admin portal | P2 | ⬜ | |

---

## IF-01 · Kai Printers — Android nativo

**Objetivo:** agente de impresión en tablet/teléfono Android para POS móvil, compatible con el protocolo WebSocket v2 usado por `print-service-client`.

**Dependencias externas:** definición de stack (Kotlin vs RN); impresoras objetivo en pilotos.

### F0 — Descubrimiento y diseño

| ID | Tarea | Prioridad | Estado | Notas |
|----|-------|-----------|--------|-------|
| IF-01.T1 | Inventariar escenarios POS Android (mismo dispositivo vs tablet + impresora LAN) | P1 | ⬜ | Entrevistas + 2–3 clientes piloto |
| IF-01.T2 | Matriz impresoras: BT SPP, USB OTG, Wi‑Fi raw, ESC/POS | P1 | ⬜ | Zebra, Epson TM, genéricas 80 mm |
| IF-01.T3 | Decidir stack app (`Kotlin` recomendado vs alternativas) | P1 | ⬜ | Ver IF-01 §5 |
| IF-01.T4 | Validar WSS/TLS en WebView Chrome Android con cert autofirmado | P1 | ⬜ | Mixed content desde PWA HTTPS |
| IF-01.T5 | Cerrar IF-01 v1.0 y pasar estado a **Listo** | P2 | ⬜ | Revisión con equipo POS |

### F1 — MVP mismo dispositivo

| ID | Tarea | Prioridad | Estado | Notas |
|----|-------|-----------|--------|-------|
| IF-01.T10 | Crear módulo/repo `kai-printers-android` en monorepo | P1 | ⬜ | Gradle, CI básico |
| IF-01.T11 | Foreground Service + notificación persistente | P1 | ⬜ | Política Android 14+ |
| IF-01.T12 | WebSocket server local (puerto configurable) | P1 | ⬜ | Paridad mensajes `hello`, v2.1 |
| IF-01.T13 | Cola de jobs + persistencia SQLite/Room | P1 | ⬜ | Misma semántica que desktop |
| IF-01.T14 | Impresión ticket: PDF Base64 → raster → ESC/POS | P1 | ⬜ | MVP 80 mm |
| IF-01.T15 | Pantalla config: propósitos `tickets` / `documents` | P2 | ⬜ | Mínimo viable |
| IF-01.T16 | Prueba E2E: `pwa-pos` en Chrome Android → app nativa | P1 | ⬜ | Mismo host 127.0.0.1 |

### F2 — Red local y operación

| ID | Tarea | Prioridad | Estado | Notas |
|----|-------|-----------|--------|-------|
| IF-01.T20 | Bind LAN (`0.0.0.0`) + lista blanca de orígenes | P2 | ⬜ | Tablet POS + agente en caja |
| IF-01.T21 | Descubrimiento mDNS/Bonjour opcional (`_kaiprinters._tcp`) | P3 | ⬜ | Facilitar pairing |
| IF-01.T22 | Sincronización config desde `pwa-admin` / `pwa-pos` | P2 | ⬜ | Comandos `set_config`, `config_changed` |
| IF-01.T23 | Health push `printer_health` + reconexión automática | P2 | ⬜ | Paridad `print-service-client` |
| IF-01.T24 | Distribución APK/AAB (interno + Play Console privado) | P2 | ⬜ | Firma, versionado semver |

### F3 — Paridad y hardening

| ID | Tarea | Prioridad | Estado | Notas |
|----|-------|-----------|--------|-------|
| IF-01.T30 | Propósito `labels` (ZPL vía BT/Wi‑Fi) | P3 | ⬜ | Retail con etiquetas |
| IF-01.T31 | Impresión A4 vía Android Print Framework | P3 | ⬜ | Documentos PDF |
| IF-01.T32 | Autostart tras boot + optimización batería (whitelist UX) | P2 | ⬜ | OEM Samsung/Xiaomi |
| IF-01.T33 | Telemetría local (logs exportables) sin PII | P3 | ⬜ | Soporte en campo |
| IF-01.T34 | Documentar en AR §10 y retirar de “futuras” | P2 | ⬜ | Estado **Hecho** |

---

## IF-02 · POS offline-first

**Objetivo:** todo `pwa-pos` operativo sin red; sync idempotente; folios oficiales solo en servidor.

**Dependencias:** IF-05/IF-04 online recomendados antes de F3 offline; IF-03 absorbe picos de sync.

### F0 — Diseño

| ID | Tarea | Prioridad | Estado | Notas |
|----|-------|-----------|--------|-------|
| IF-02.T1 | Cerrar spec API `POST /pos/sync/commands` + tabla idempotencia | P0 | ⬜ | Ver IF-02 §6.3 |
| IF-02.T2 | Decidir política stock offline (A/B/C) | P0 | ⬜ | Producto |
| IF-02.T3 | Modelo `LOCAL_SESSION` vs sesión servidor | P0 | ⬜ | Caja offline |
| IF-02.T4 | Pasar IF-02 a **Listo** | P1 | ⬜ | Revisión equipo |

### F1 — Infraestructura cola local

| ID | Tarea | Prioridad | Estado | Notas |
|----|-------|-----------|--------|-------|
| IF-02.T10 | IndexedDB stores: commands, catalog, stock_snapshot | P0 | ⬜ | `pwa-pos` |
| IF-02.T11 | Detección red + indicador topbar | P0 | ⬜ | Distinto de print-service |
| IF-02.T12 | Worker sync FIFO + reintentos | P0 | ⬜ | Background |
| IF-02.T13 | Backend idempotencia `clientOperationId` | P0 | ⬜ | Migración DB |
| IF-02.T14 | UI cola: pendiente / error / resuelto | P1 | ⬜ | Panel operador |

### F2 — Venta y caja (online sync path)

| ID | Tarea | Prioridad | Estado | Notas |
|----|-------|-----------|--------|-------|
| IF-02.T20 | Venta contado offline + folio provisional | P0 | ⬜ | Ticket IF-01 |
| IF-02.T21 | Cache catálogo al abrir sesión | P0 | ⬜ | Pull incremental |
| IF-02.T22 | Movimientos caja + hub offline | P1 | ⬜ | Comandos en cola |
| IF-02.T23 | Cierre caja offline + reconciliación | P1 | ⬜ | Sin ventas huérfanas |
| IF-02.T24 | Prueba E2E: 2 POS, uno offline, sin folio duplicado | P0 | ⬜ | Aceptación MVP |

### F3 — Flujos extendidos + IF-04/05

| ID | Tarea | Prioridad | Estado | Notas |
|----|-------|-----------|--------|-------|
| IF-02.T30 | AR collect, devoluciones, NC offline | P1 | ⬜ | Paridad PosPaymentWorkspace |
| IF-02.T31 | Encargos, cotización, recepción offline | P2 | ⬜ | F3 |
| IF-02.T32 | Crédito / cuotas offline (post IF-05) | P1 | ⬜ | Snapshot límite |
| IF-02.T33 | CxP offline (post IF-04) | P2 | ⬜ | Idempotencia pago |
| IF-02.T34 | Cola fiscal DTE / SII separada | P2 | ⬜ | Ver IF-02 §9 |

### F4 — Hardening multi-POS

| ID | Tarea | Prioridad | Estado | Notas |
|----|-------|-----------|--------|-------|
| IF-02.T40 | Resolución conflictos stock UI | P1 | ⬜ | Rol MANAGER |
| IF-02.T41 | Métricas sync (lag, tasa error) | P2 | ⬜ | Observabilidad |
| IF-02.T42 | Documentar en AR §6 y marcar **Hecho** | P2 | ⬜ | Cierre IF-02 |

---

## IF-03 · Mensajería y colas

**Objetivo:** outbox + workers para ventas/stock/eShop; Kafka documentado en F3 **pospuesto**.

**Dependencias:** complementa IF-02 sync masivo.

### F0 — Diseño

| ID | Tarea | Prioridad | Estado | Notas |
|----|-------|-----------|--------|-------|
| IF-03.T1 | Esquema tabla `outbox_events` | P1 | ⬜ | Migración |
| IF-03.T2 | Elegir transporte F1 (BullMQ vs PG poll) | P1 | ⬜ | Ver IF-03 D1 |
| IF-03.T3 | Pasar IF-03 F1 a **Listo** | P2 | ⬜ | Sin Kafka en F1 |

### F1 — Outbox MVP

| ID | Tarea | Prioridad | Estado | Notas |
|----|-------|-----------|--------|-------|
| IF-03.T10 | Outbox en create SALE | P1 | ⬜ | Misma transacción DB |
| IF-03.T11 | Worker stock (`inventory.commands`) | P1 | ⬜ | Partition key variant |
| IF-03.T12 | Worker contabilidad async | P1 | ⬜ | AccountingEngine |
| IF-03.T13 | Idempotencia consumidores | P1 | ⬜ | Tests |
| IF-03.T14 | API respuesta rápida POS (&lt;500ms p95) | P1 | ⬜ | Criterio aceptación |

### F2 — eShop + observabilidad

| ID | Tarea | Prioridad | Estado | Notas |
|----|-------|-----------|--------|-------|
| IF-03.T20 | Cola `eshop.orders` | P1 | ⬜ | Checkout |
| IF-03.T21 | DLQ + reintentos exponenciales | P1 | ⬜ | |
| IF-03.T22 | Métricas lag outbox | P2 | ⬜ | Alertas |

### F3 — Kafka (pospuesto)

| ID | Tarea | Prioridad | Estado | Notas |
|----|-------|-----------|--------|-------|
| IF-03.T30 | Evaluar umbral migración Kafka | P3 | ⬜ | **Pospuesto** |
| IF-03.T31 | POC bridge outbox → Kafka | P3 | ⬜ | Solo si métricas exigen |

---

## IF-04 · Cuentas por pagar en POS

**Objetivo:** pagar obligaciones desde POS con paridad de medios de pago con admin.

**Dependencias:** backend listo; IF-02 F2 para offline.

### F0 — Diseño

| ID | Tarea | Prioridad | Estado | Notas |
|----|-------|-----------|--------|-------|
| IF-04.T1 | Definir roles con permiso de pago | P2 | ⬜ | MANAGER+ |
| IF-04.T2 | Pasar IF-04 a **Listo** | P2 | ⬜ | |

### F1 — MVP online

| ID | Tarea | Prioridad | Estado | Notas |
|----|-------|-----------|--------|-------|
| IF-04.T10 | Feature `accounting-accounts-payable` en `pwa-pos` | P2 | ⬜ | Request + actions |
| IF-04.T11 | Ruta `/accounts-payable` + ícono TopBar | P2 | ⬜ | |
| IF-04.T12 | Lista filtrable + detalle obligación | P2 | ⬜ | Paridad admin grid |
| IF-04.T13 | Diálogo completar pago (efectivo, transferencia, cheque) | P2 | ⬜ | |
| IF-04.T14 | Trazabilidad sesión caja (`cashSessionId`) | P2 | ⬜ | Ver D2 IF-04 |
| IF-04.T15 | Prueba E2E: pago proveedor desde POS visible en admin | P2 | ⬜ | |

### F2 — Offline

| ID | Tarea | Prioridad | Estado | Notas |
|----|-------|-----------|--------|-------|
| IF-04.T20 | Comando CxP en cola IF-02 | P2 | ⬜ | Idempotencia |
| IF-04.T21 | Manejo conflicto doble pago | P2 | ⬜ | |

---

## IF-05 · Crédito clientes POS

**Objetivo:** cobro de cuotas y unificación `INTERNAL_CREDIT`; backend ya existe.

**Dependencias:** IF-02 F3 para offline.

### F0 — Diseño

| ID | Tarea | Prioridad | Estado | Notas |
|----|-------|-----------|--------|-------|
| IF-05.T1 | Resolver D1: `pay-quota` + `cashSessionId` | P1 | ⬜ | Backend + POS |
| IF-05.T2 | Pasar IF-05 a **Listo** | P1 | ⬜ | |

### F1 — Cobro cuotas online

| ID | Tarea | Prioridad | Estado | Notas |
|----|-------|-----------|--------|-------|
| IF-05.T10 | `QuotasSection` con selección múltiple | P1 | ⬜ | Patrón PurchasesSection |
| IF-05.T11 | Draft + `mode=quota` en PosPaymentWorkspace | P1 | ⬜ | |
| IF-05.T12 | Integrar `POST /payments/pay-quota` | P1 | ⬜ | |
| IF-05.T13 | Recibo / confirmación post-cobro | P1 | ⬜ | |
| IF-05.T14 | Completar `/pos/credit-payment` o redirigir a ficha | P2 | ⬜ | UX |
| IF-05.T15 | Prueba E2E cobro cuota desde ficha cliente | P1 | ⬜ | |

### F2 — INTERNAL_CREDIT

| ID | Tarea | Prioridad | Estado | Notas |
|----|-------|-----------|--------|-------|
| IF-05.T20 | Medio `INTERNAL_CREDIT` en venta con validación UI | P1 | ⬜ | availableCredit |
| IF-05.T21 | Feedback límite en panel cobro | P2 | ⬜ | |

### F3 — Offline

| ID | Tarea | Prioridad | Estado | Notas |
|----|-------|-----------|--------|-------|
| IF-05.T30 | Snapshot límite crédito en cache IF-02 | P1 | ⬜ | |
| IF-05.T31 | Comando cobro cuota offline | P1 | ⬜ | |

---

## IF-06 · eShop — plantillas y tema

**Objetivo:** presets de color + overrides por empresa; aplicación dinámica en `pwa-eshop` vía CSS variables; admin `/e-shop/appearance`.

**Dependencias:** ninguna bloqueante.

### F1 — Tokens y presets (entregado)

| ID | Tarea | Prioridad | Estado | Notas |
|----|-------|-----------|--------|-------|
| IF-06.T1 | Documento IF-06 + README/ROADMAP/AR §5.3 | P1 | ✅ | |
| IF-06.T2 | Dominio `company-eshop-theme` + presets + sanitize/resolve | P1 | ✅ | `companies.settings` |
| IF-06.T3 | API admin GET/PATCH `eshop-theme` + `theme` en storefront | P1 | ✅ | |
| IF-06.T4 | `EShopThemeShell` + layout `pwa-eshop` | P1 | ✅ | CSS vars inline |
| IF-06.T5 | Admin `/e-shop/appearance` + menú | P1 | ✅ | |
| IF-06.T6 | Seed demo `classic` + verificación manual | P2 | ✅ | |

### F2 — Layouts home alternativos

| ID | Tarea | Prioridad | Estado | Notas |
|----|-------|-----------|--------|-------|
| IF-06.T10 | `templateId` selecciona layout home | P2 | ⬜ | Estructura distinta |
| IF-06.T11 | Preview iframe tienda en admin | P3 | ⬜ | |

### F3 — Tipografía y dark mode

| ID | Tarea | Prioridad | Estado | Notas |
|----|-------|-----------|--------|-------|
| IF-06.T20 | `fontPreset` whitelist | P3 | ⬜ | |
| IF-06.T21 | `borderRadius` token | P3 | ⬜ | |
| IF-06.T22 | Dark mode por tienda | P3 | ⬜ | |

---

## IF-07 · eShop — Topbar y Footer

**Objetivo:** admin de enlaces, toggles y columnas de footer; menú móvil en tienda; colores en IF-06.

**Dependencias:** IF-06 F1 (token `chrome`).

### F1 — Shell administrable (entregado)

| ID | Tarea | Prioridad | Estado | Notas |
|----|-------|-----------|--------|-------|
| IF-07.T1 | Dominio nav + topbar + footer + sanitize | P1 | ✅ | `eShopTopBar`, `eShopFooter` |
| IF-07.T2 | API GET/PATCH + `topBar`/`footer` en storefront | P1 | ✅ | |
| IF-07.T3 | `EShopTopBar` + `EShopFooter` dinámicos | P1 | ✅ | |
| IF-07.T4 | `EShopMobileNav` hamburger | P1 | ✅ | |
| IF-07.T5 | Admin `/e-shop/topbar` y `/e-shop/footer` | P1 | ✅ | |
| IF-07.T6 | IF-07 doc + seed + verificación | P2 | ✅ | |

---

## IF-12 · Mercado Pago — POS Point + eShop Bricks

**Objetivo:** cobro con terminal Point en caja y pago online con Checkout Bricks en eShop, módulo backend compartido.

Ver [IF-12-mercado-pago-pos-y-eshop.md](./IF-12-mercado-pago-pos-y-eshop.md).

### F1 — Backend + settings

| ID | Tarea | Prioridad | Estado | Notas |
|----|-------|-----------|--------|-------|
| IF-12.T1 | IF-12 doc + ROADMAP + integraciones index | P1 | ✅ | |
| IF-12.T2 | `company-mercado-pago.types` + CompaniesService + API | P1 | ✅ | |
| IF-12.T3 | `payment_gateway_intents` entity + migration | P1 | ✅ | |
| IF-12.T4 | `MercadoPagoClient` + webhook | P1 | ✅ | |
| IF-12.T5 | Admin `/settings/integrations` + `/e-shop/integrations` | P1 | ✅ | |

### F2 — POS Point

| ID | Tarea | Prioridad | Estado | Notas |
|----|-------|-----------|--------|-------|
| IF-12.T10 | Endpoints `/pos/mp-point/intents` | P1 | ✅ | |
| IF-12.T11 | UI `PosPaymentWorkspace` + hook | P1 | ✅ | |
| IF-12.T12 | Validación intent en `createSale` | P1 | ✅ | |

### F3 — eShop Bricks

| ID | Tarea | Prioridad | Estado | Notas |
|----|-------|-----------|--------|-------|
| IF-12.T15 | `checkout/prepare` + `confirm-payment` | P1 | ✅ | |
| IF-12.T16 | Payment Brick en checkout | P1 | ✅ | |
| IF-12.T17 | `paymentExpectation` metadata | P1 | ✅ | |

### F4 — Calidad

| ID | Tarea | Prioridad | Estado | Notas |
|----|-------|-----------|--------|-------|
| IF-12.T20 | Tests unitarios backend | P2 | ✅ | |

---

## Backlog de nuevas implementaciones (sin IF asignado)

Ideas para convertir en `IF-XX` cuando haya owner:

| Idea | Notas | Prioridad sugerida |
|------|-------|-------------------|
| Kai Printers iOS nativo | Misma necesidad que IF-01 en iPad POS | P3 |
| Pasarela pago online eShop | Ver IF-12 | P1 (IF-12) |
| Módulo SII / DTE integrado | Ver [Definición Módulo SII](../legacy/Definición%20Módulo%20SII%20KaiStore.md) | P2 |
| KaiFood — salones y comandas | [KAISTORE_ROADMAP](../legacy/KAISTORE_ROADMAP.md) fases K* | P1 producto |

---

## Plantilla — copiar para nueva implementación

```markdown
## IF-XX · Título

**Objetivo:** …

### F0 — …

| ID | Tarea | Prioridad | Estado | Notas |
|----|-------|-----------|--------|-------|
| IF-XX.T1 | … | P1 | ⬜ | … |
```

[← Índice implementaciones](./README.md)
