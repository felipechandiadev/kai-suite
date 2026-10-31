# Análisis de la app POS (kai-pos + endpoints que usa en kai-core)

Fecha: 2026-10-30. Alcance: flujo de venta online/offline, sincronización, caja y calidad de código.
No revisado en profundidad: salón (dining), lavandería, delivery, clientes, impresión, motor de promociones, UX.
"Verificado" = leí el código que lo demuestra. "Sin probar" = no ejecuté el escenario.

## Línea base
- vitest: 139 tests pasan; 1 suite no carga (`build-offline-boleta-preview.spec.ts`: no resuelve `@kai/fiscal-ted`).
- tsc: ~70 errores. eslint: 186 errores / 54 avisos (124 `react-hooks/set-state-in-effect`, 38 `no-explicit-any`).
- `PosPaymentWorkspace.tsx` tiene 5.280 líneas.

## Alta severidad
1. **Venta offline rechazada por stock al sincronizar.** `createSaleFromOfflineSync` usa `skipStockCheck:false` sin `skipStockAvailabilityCheck`; con la política BLOCK (D.1, por defecto) una venta ya entregada e impresa (con folio CAF consumido) vuelve como CONFLICT. Fix: `skipStockAvailabilityCheck:true` (el stock igual se descuenta, queda negativo y se registra). Verificado.
2. **Fallos de sync quedan cacheados para siempre.** `PosSyncService.syncCommand` devuelve `responseJson` también para FAILED/CONFLICT, así que "Reintentar" en el POS nunca puede tener éxito. El cliente reintenta FAILED sin fin cada ≤60 s, un FAILED/CONFLICT bloquea el cierre de caja (`CLOSE_SESSION` depende de las ventas) y "Descartar" borra la venta local sin dejar rastro. Verificado.
3. **Ventas online sin idempotencia.** `POST /cash-sessions/sales` no lleva `clientOperationId`; si la conexión cae después de que el servidor confirmó, el cajero reintenta y se duplica la venta. `backendFetch` no tiene timeout. Verificado en código; sin probar.
4. **El servidor confía en precios, descuentos, impuestos y costo del cliente.** `SaleLineDto` no valida `@Min` en cantidad/precio/descuento; `minPrice` y `maxDiscountPercent` se envían al POS pero nunca se aplican en el backend; `unitCost` explícito se acepta. Una cantidad negativa en una venta sumaría stock. Verificado por lectura; sin probar.
5. **`userName` lo envía el cliente.** En sync (`/pos/sync/commands`) y en los endpoints de caja el usuario sale del body, no del token. La server action online lo rellena desde la sesión, pero quien llame a la API directo puede operar a nombre de otro usuario que conozca (necesita además el id de sesión). Verificado.
6. **Costo y margen mal calculados cuando unidad de venta ≠ unidad de stock.** `unitCost` congelado = PMP por unidad de stock (`resolveFrozenSaleUnitCost`), pero los reportes multiplican `unitCost × quantity` (cantidad en unidad de venta). Afecta los reportes de rentabilidad de C.3 y cualquier costo de venta basado en la línea. Pendiente corregir usando `quantityInBase`. Verificado por lectura.

## Media severidad
7. **Fallo fiscal oculto.** `adoptOfflineEmission` puede devolver `FAILED` dentro de una respuesta `success:true`; el POS marca el comando SYNCED e ignora `fiscalEmission`. Verificado.
8. **Offline descarta promociones y descuentos** (`discount:null`, `appliedPromotions:[]`) pero envía `appliedTotal` calculado online; si el cliente ya vio el precio con descuento, el pago puede no calzar con el total recalculado y la venta quedaría FAILED. Inferido; sin probar.
9. **Clave privada del CAF en IndexedDB en claro** (riesgo ya documentado en `AGENTS.md`). En un equipo compartido permite firmar boletas.
10. **Número local de documento no atómico**: `nextLocalDocumentNumber` lee y escribe `localFolioSeq` fuera de la transacción de la venta.
11. **Código muerto con clave equivocada**: `decrementOfflineCatalogStock` busca por `variantId` en un catálogo con clave compuesta y nadie lo usa.
12. **Errores de tipos que apuntan a flujos reales**: `LoadQuotationDialog` arma líneas sin `taxCategory/requiresDte/taxIds` (la boleta se bloquea con "No se pudo clasificar el perfil fiscal"); `FALLBACK_METHOD_LABEL` no tiene `VOUCHER`. Sin probar.

## Calidad / mantenibilidad
- Un componente de 5.280 líneas concentra confirmación de venta, lavandería, encargos, NC y offline.
- Los errores `set-state-in-effect` (regla nueva de React 19) deberían tratarse por lotes; no son bugs en sí.
- Suite de tests offline buena (cola, folios, catálogo); faltan pruebas del backend de sync contra BD real (conflictos, reintentos, cierre).

## Orden sugerido
1. #1, #2 y #3 (cambios chicos, evitan pérdida o duplicación de ventas).
2. #4 y #5 (validación en servidor).
3. #6 (corrige reportes de margen).
4. #7 y #8, luego deuda de lint/tipos y partir `PosPaymentWorkspace`.
