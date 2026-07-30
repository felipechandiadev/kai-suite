# Reparto local multi-canal — estado actual, consideraciones y destino

Documento de producto y arquitectura para el módulo de **reparto local** en Kai (KaiStore / KaiFood).  
Complementa el detalle espacial en [`POSTGIS-DELIVERY.md`](./POSTGIS-DELIVERY.md).

**Última actualización:** 2026-07-15.

---

## 1. Resumen ejecutivo

El dominio nació bajo **eShop** (checkout web + admin «Encargos y envíos»).  
Con el flujo de **reparto en POS** (sesión de pago → metadata → pedido de delivery), el mismo motor sirve a **dos canales de origen**.

Consecuencia:

> Un motor de reparto, varios canales.  
> El menú y los permisos deben seguir al **motor**, no a la tienda web.

Este documento describe **cómo funciona hoy** el motor multi-canal, el menú raíz **Delivery**, el tablero **Repartos**, y la app de repartidores **Kai Delivery**.

---

## 2. Glosario (definiciones de producto)

| Concepto | Definición |
| --- | --- |
| **Delivery** (módulo) | Capacidad de empresa y menú raíz admin: zonas, franjas, bodega, ruteo, tablero y app de repartidores. Independiente del canal. |
| **Repartos** (tablero) | Pantalla diaria `/reparto/repartos` (antes «Operación»): kanban, franjas y rutas del día. |
| **Despacho** (ruta) | Agrupación de paradas de una franja (`delivery_dispatches` + stops / OSRM). Un PICKUP no es un despacho de ruta. |
| **Kai Delivery** (app) | PWA para repartidores (`kai-delivery`, puerto 5035). Rol BD `COURIER` (UI «Repartidor»). API aún bajo `/api/courier`. |
| **Canal de origen** | De dónde nace el pedido de entrega: `ESHOP` (checkout) o `POS` (venta en caja). Extensible. |
| **Cobertura** | Comunas habilitadas (hoy Región del Maule). Filtro regional / legal-comercial. |
| **Zona** | Polígono PostGIS + tarifa (`shipping_fee`) + opcional `commune_code`. Resuelve cobertura por punto. |
| **Franja (`occurrence`)** | Slot de un día: `LOCAL_DELIVERY` (hora de salida) o `PICKUP` (ventana de retiro). Puede atender pedidos de cualquier canal. |
| **Pedido de delivery** | Unidad operativa (`delivery_orders`): estado, dirección, zona, franja, vínculo a `transaction_id`. |
| **Fulfillment eShop (solo tienda)** | Qué ofrece el checkout web (retiro / reparto / flat), copy y pedidos web filtrados. No es el motor de zonas/calendario. |
| **Flag `localDeliveryEnabled`** | En `delivery_settings`: enciende el motor y el menú **Delivery** (POS + eShop lo consultan). |
| **Flag `eShopEnabled`** | En settings de empresa: enciende la tienda. **No** gatea el menú de delivery operativo. |

**Naming de UI:** menú admin **Delivery**; tablero diario **Repartos**; app móvil **Kai Delivery**.

---

## 3. Cómo funciona hoy

### 3.1 Piezas principales

```
┌─────────────┐     ┌──────────────┐     ┌────────────────────────────┐
│  kai-eshop  │────▶│  API public  │──┐  │                            │
│  checkout   │     │ delivery/    │  │  │  módulo NestJS             │
└─────────────┘     │ public/*     │  ├──▶│  delivery                  │
                    └──────────────┘  │  │  (settings, zones,         │
┌─────────────┐     ┌──────────────┐  │  │   occurrences, orders,     │
│  kai-pos    │────▶│  API POS     │──┤  │   dispatches, courier)     │
│  /payment   │     │ delivery/pos │  │  │                            │
│  + card     │     │ /*           │  │  └────────────────────────────┘
└─────────────┘     └──────────────┘  │
                                      │  tablas: delivery_*
┌─────────────┐     ┌──────────────┐  │  + PostGIS geom / point
│  kai-admin  │────▶│  API admin   │──┘
│  /reparto/* │     │ delivery/    │
│             │     │ admin/*      │
└─────────────┘     └──────────────┘
┌─────────────┐     ┌──────────────┐
│ kai-delivery│────▶│ API courier  │
│ (PWA)       │     │ /courier/*   │
└─────────────┘     └──────────────┘
        ▲
        │  menú raíz: Delivery (gate: localDeliveryEnabled)
        │  eShop: Pedidos web + Métodos
```

### 3.2 Admin (`/reparto/*` + eShop fulfillment)

**Menú raíz Delivery** (`requiresLocalDeliveryEnabled` vía `localDeliveryEnabled`):

| Ruta | Qué hace |
| --- | --- |
| `/reparto/repartos` | Tablero kanban / rutas del día (**Repartos**) |
| `/reparto/calendario` | Franjas LOCAL_DELIVERY / PICKUP |
| `/reparto/zonas` | Polígonos + tarifa |
| `/reparto/cobertura` | Comunas Maule on/off |
| `/reparto/configuracion` | Bodega, OSRM, `localDeliveryEnabled` |

**eShop → Encargos y envíos** (gate `requiresEShopEnabled`):

| Tab | Qué hace |
| --- | --- |
| Pedidos web | Lista / detalle pedidos de tienda |
| Métodos | Métodos de checkout + settings stock/sucursal |

Redirects permanentes desde `/e-shop/fulfillment/{operacion,calendario,zonas,cobertura,configuracion,reparto}` → `/reparto/...`.

**Smoke Fase 1:** empresa con `localDeliveryEnabled=true` y `eShopEnabled=false` → menú **Delivery** visible; **eShop** oculto. Bookmarks antiguos caen por redirects.

### 3.3 eShop (checkout)

1. Cliente ingresa dirección / mapa (`LocationPicker`).
2. `geocode` + `resolve-zone` (PostGIS `ST_Contains` o fallback comuna).
3. `quote` (tarifa / free shipping).
4. `available-occurrences` (franjas futuras de la zona).
5. Al confirmar pedido se crea `delivery_orders` ligado a la transacción.

### 3.4 POS (sesión de pago)

1. En `/pos/payment`, card horizontal **Reparto** (junto al bloque cliente).
2. Diálogo: dirección, comuna, mapa, validar cobertura, **cards de franja**, notas.
3. Config se guarda en carrito (`posDelivery`) y va en el payload de venta (`metadata.posDelivery`).
4. Al confirmar venta, `sales-from-session` valida el snapshot y `DeliveryOrderService.createFromPosSale` crea el pedido de delivery (`LOCAL_DELIVERY`).
5. La tarifa suma al monto a pagar (`amountToPayWithPosDelivery`).

APIs POS: `GET/POST …/api/e-shop/pos/delivery/{coverage,geocode,resolve-zone,quote,available-occurrences}`  
(mismas reglas que público, auth de operador).

### 3.5 Kai Delivery (app repartidor)

PWA [`kai-delivery`](../../kai-delivery) (marca **Kai Delivery**, puerto 5035).  
API bajo `@Controller('courier')`: login, listar repartos, stops, start, complete.  
Requieren usuario con rol `COURIER`. Opera sobre dispatches de franjas; no distingue UI de canal (sí debería poder mostrar origen del pedido).

### 3.6 Datos (simplificado)

- `delivery_settings` — bodega, OSRM, `local_delivery_enabled`
- `delivery_coverage_communes`
- `delivery_zones` (+ `geom`)
- `delivery_occurrences` (+ kind LOCAL_DELIVERY | PICKUP)
- `delivery_occurrence_zones`
- `delivery_orders` — ligado 1:1 a `transaction_id` hoy
- `delivery_dispatches` / `stops` / picks

Seed demo: zona Parral, calendario jul–ago 2026 (reparto diario + retiro en local). Ver `seeds/demo/seed-delivery-calendar.ts`.

**OSRM (ruteo):** el cliente HTTP vive en `kai-core/src/modules/routing/`; el contenedor y bootstrap están en [`services/kai-osrm`](../../services/kai-osrm/README.md) (`docker compose -f services/kai-osrm/docker-compose.osrm.yml up -d`). Detalle ops: [`docs/apps/SERVICES-SIDECARS.md`](../apps/SERVICES-SIDECARS.md) §5.

---

## 4. Observaciones (tensiones actuales)

1. **IA de menú desalineada con el dominio**  
   Cobertura / zonas / calendario / tablero viven bajo eShop y exigen `eShopEnabled`. Una empresa con solo POS no encuentra (o pierde) la operación de reparto.

2. **Nombre «Operación» poco claro**  
   Compite con «sesión de caja», «operación de venta», etc. El trabajo diario es **gestionar repartos** → label **«Repartos»**.

3. **Tabs mezclan capas**  
   «Pedidos web» y «Métodos» (checkout) son de **tienda**.  
   Zonas / calendario / tablero son de **empresa**.  
   Estar en la misma pestaña confunde roles (marketing eShop vs logística).

4. **Naming técnico `e_shop_*` / módulo `e-shop-delivery`**  
   Correcto al nacer; ahora es deuda. No es bloqueante para el cambio de menú; sí para claridad a largo plazo.

5. **Origen del pedido poco visible en operación**  
   POS y eShop crean el mismo tipo de `delivery_order`, pero el tablero aún se siente «web». Falta filtro / badge de canal (`POS` | `ESHOP`).

6. **Doble API pública/POS**  
   Coherente (auth distinta), pero ambas viven bajo path `e-shop/…`. El path sugiere exclusividad eShop aunque la lógica ya es compartida.

7. **Pickup en POS**  
   El calendario ya tiene `PICKUP`; el diálogo POS actual se centra en reparto a domicilio. Decisión de producto: ¿retiro en local desde caja en una fase siguiente?

8. **Unicidad `transaction_id`**  
   El modelo asume un delivery order por venta. Válido para MVP; documentar si más adelante hay reenvíos / splits.

---

## 5. Cómo debería funcionar (estado futuro)

### 5.1 Principio

> **Un motor de reparto, varios canales.**  
> Admin configura y opera el motor en un menú raíz **Reparto**.  
> eShop solo configura la **experiencia de tienda** y lista pedidos web.

### 5.2 Menú admin propuesto

```
Reparto                          ← raíz TopBar / SideBar
  ├─ Repartos                    ← tablero del día (antes «Operación»)  [default]
  ├─ Calendario
  ├─ Zonas
  ├─ Cobertura
  └─ Configuración               ← bodega, OSRM, localDeliveryEnabled

eShop
  ├─ Apariencia / Topbar / Footer / Hero / …
  ├─ Métodos de entrega          ← qué se ofrece en checkout
  └─ Pedidos web                 ← filtro canal ESHOP (link a detalle/reparto)
```

- Visibilidad del menú **Reparto**: ligada a `localDeliveryEnabled` (o flag de módulo), **no** a `eShopEnabled`.
- Rutas objetivo (ejemplo): `/reparto/repartos`, `/reparto/calendario`, …  
  Redirects permanentes desde `/e-shop/fulfillment/...` durante la transición.

### 5.3 Tablero «Repartos»

- Misma UX base que el tablero actual (kanban, franja, rutas, picking).
- Filtro **Canal: Todos | POS | eShop**.
- Badge de origen en cada card.
- Deep-link a venta POS o pedido web según corresponda.

### 5.4 Canales

| Canal | Captura | Cobra fee | Crea `delivery_order` |
| --- | --- | --- | --- |
| eShop | Checkout ubicación + franja | Sí (checkout) | Al confirmar pedido |
| POS | Card + diálogo en `/payment` | Sí (en total a pagar) | Al confirmar venta |
| (futuro) | … | … | … |

Calendario y zonas son **únicos** por empresa (salvo decisión explícita de multi-bodega / multi-calendario después).

### 5.5 Roles

| Rol | Usa |
| --- | --- |
| Operador logístico / Admin | Menú Reparto (calendario, zonas, tablero **Repartos**) |
| Operador POS | Solo captura en caja; no necesita menú eShop |
| Editor eShop | Métodos de checkout + pedidos web |
| Courier | App courier sobre franjas del día |

---

## 6. Consideraciones para migrar (plan por fases)

### Fase 1 — Información Arquitectura de menú + copy (alto valor / bajo riesgo)

- [x] Nuevo ítem raíz **Reparto** en `mainMenu.ts`.
- [x] Mover pantallas compartidas a `/reparto/*` (layout + páginas que reutilizan UI; redirects).
- [x] Gate por `localDeliveryEnabled` (`requiresLocalDeliveryEnabled` en SideBar + CompanyProvider).
- [x] Renombrar tab/pantalla **Operación → Repartos**.
- [x] Dejar en eShop: Métodos + Pedidos web.
- [x] Actualizar títulos / docs (`REPARTO-MULTI-CANAL.md`).

No requiere rename de tablas ni módulos Nest.

### Fase 2 — Producto multi-canal en el tablero

- [x] Persistir o derivar `sourceChannel` (`POS` | `ESHOP`) en pedidos / proyección del board.
- [x] Filtro y badge de canal en **Repartos**.
- [x] Contadores por canal en toolbar.

### Fase 3 — API paths (opcional, gradual)

- [x] Introducir aliases `/api/delivery/admin/*`, `/api/delivery/pos/*`, `/api/delivery/public/*`.
- [x] Deprecar paths `e-shop/.../delivery` con compatibilidad (controllers dual-path).

### Fase 4 — Rename técnico (solo cuando el producto esté estable)

- [x] Módulo `e-shop-delivery` → `delivery`.
- [x] Tablas `e_shop_delivery_*` → `delivery_*` (migración TypeORM + bootstrap rename).
- [x] Actualizar [`POSTGIS-DELIVERY.md`](./POSTGIS-DELIVERY.md) y seeds.

**Regla del monorepo:** no mezclar en el mismo PR rename de storage/protocolo con cosmética de menú.

### Riesgos a vigilar

| Riesgo | Mitigación |
| --- | --- |
| Bookmarks a `/e-shop/fulfillment/*` | Redirect 308 / Next redirects |
| Tests E2E / `data-test-id` | Actualizar en la misma Fase 1 |
| Permisos OPERATOR sin eShop | Nuevo gate de menú + smoke POS + admin |
| Confusión «Pedidos web» vs «Repartos» | Copy claro + deep links |

---

## 7. Decisiones abiertas (para product)

1. ¿**Pickup (retiro)** se captura en POS además de eShop?  
2. ¿El flag maestro se llama `localDeliveryEnabled` o se separa «módulo Reparto» vs «ofrecer en eShop»?  
3. ¿Una empresa sin eShop ve el menú Reparto completo (sí, recomendado)?  
4. ¿Prioridad Fase 2 (badge canal) antes o después del move de menú?  
5. ¿Calendario compartido siempre, o calendarios por sucursal a medio plazo?

---

## 8. Mapa rápido de código (hoy)

| Área | Ubicación |
| --- | --- |
| Dominio Nest | `kai-core/src/modules/delivery/` |
| Admin UI (motor) | `kai-admin/app/(app)/reparto/` (+ UI compartida en `e-shop/fulfillment/ui/`) |
| Admin UI (tienda) | `kai-admin/app/(app)/e-shop/fulfillment/` (Pedidos + Métodos) |
| Menú | `kai-admin/src/navigation/mainMenu.ts` |
| POS UI | `kai-pos/src/features/pos-delivery/` + payment workspace |
| Metadata venta | `kai-core/.../cash-sessions/application/pos-delivery.metadata.ts` |
| Creación order POS | `DeliveryOrderService.createFromPosSale` |
| PostGIS | [`POSTGIS-DELIVERY.md`](./POSTGIS-DELIVERY.md) |
| Seed calendario | `seeds/demo/seed-delivery-calendar.ts` |

---

## 9. Conclusión

Hoy el **motor es multi-canal** (eShop + POS) con menú raíz **Reparto**, tablero **«Repartos»**, APIs `/api/delivery/*` y tablas `delivery_*`.  
eShop conserva la cara de tienda (Métodos + Pedidos web).
