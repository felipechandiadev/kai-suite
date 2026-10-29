# Diseño: anulación de recepciones de compra (v2, con análisis de impacto transversal)

Estado: **Fase 1 implementada** (v1.31.0). Desviaciones y pendientes respecto del diseño:
- Implementado: `POST /receptions/:id/void`, estado `VOIDED` + migración `1757730000000-ReceptionVoid`, reverso contable espejo (`ledger-reversal.util.ts`), bloqueos (pagos confirmados, devoluciones/NC, stock insuficiente, PMP no restaurable salvo `acknowledgePmpNotRestored`, período cerrado), G1 (folio duplicado), G2 (filtro por compañía en lecturas, vía `OptionalCurrentCompany`), G5 (AP ignora cuotas de documentos anulados). UI en kai-admin: botón "Anular" (icono Ban junto al detalle), diálogo con motivo, estado "Anulada" y motivo en el detalle.
- Compensación: el ajuste de stock no puede ir dentro de la transacción BD (pasa por `TransactionsService`); si la transacción falla se repone con un `ADJUSTMENT_IN` y se registra en log.
- **No hecho en Fase 1**: G7 (el read-model de proveedores consulta relaciones `s.receptions`/`s.transactions` que no existen en la entidad `Supplier`; ya estaba roto/legacy, no se tocó), kardex con etiqueta específica, filtros en reportes de inventario por `origin=RECEPTION_VOID`, permiso `RECEPTIONS_VOID` (el enum solo tiene `RECEPTIONS_DELETE` y hoy no se aplica por decorador en ningún controller), pruebas contra BD real (los tests son unitarios y de controlador con mocks).
- Cuotas de `installments` se cierran como `PAID` con marca `cancelledByReceptionVoid` (G6 pendiente).

Estado original: propuesta. Origen: observación del cliente "Corregir o eliminar una factura mal ingresada".
Decisión acordada: no borrar físicamente; **anular con motivo obligatorio**. "Corregir" = anular + volver a ingresar.

Verificado leyendo el código (rama `claude/elegant-taussig-dc639a`, v1.30.0). Lo no verificado se marca **[NV]**.

Objetivo de esta versión: que la anulación no sea un parche aislado, sino que deje **inventario, costo (PMP), cuentas por pagar, caja, contabilidad, reportes y UI consistentes**, y que corrija las brechas que la anulación vuelve visibles.

---

## 1. Qué crea hoy una recepción (`ReceptionsService.createDirect`)

Archivo: `src/modules/receptions/application/receptions.service.ts`. Secuencia **sin transacción de base de datos envolvente**:

1. `Reception` + `ReceptionLine[]`.
2. `PURCHASE` (`metadata.origin='RECEPTION'`, `metadata.receptionId`), valorado al **costo neto** sin IVA. Se guarda `reception.transactionId`.
3. Si es factura/boleta: `SUPPLIER_INVOICE`/`SUPPLIER_RECEIPT` (`metadata.links.{receptionId, stockInTransactionId}`) + hijos `SUPPLIER_PAYMENT` (`relatedTransactionId` = documento fiscal): pagados (`CONFIRMED`, `PAID`; efectivo con `cashSessionId`/`cashHubId`; transferencia/cheque con `bankAccountKey`/`checkData`) o programados (`DRAFT`, `PENDING` = cuotas).
4. `recalculateParentPaymentStatus` y refresco de `expected_amount` de la sesión de caja POS.

Automatizaciones disparadas por el `PURCHASE` (`modules/automation/application/handlers/actions/`):

| Acción | Efecto |
|---|---|
| `update-stock.action.ts` | `StockLevel.physicalStock += qty`; guarda `storagePhysicalBefore/After` en `reception_lines`; recalcula `ProductVariant.pmp` (promedio ponderado) y agrega a `pmpHistory` |
| `generate-ledger-entries.action.ts` | Asientos (§4) |
| `create-installments.action.ts` | Solo si el PURCHASE trae plan en metadata; la recepción no lo envía |

Consecuencias de diseño:
- Creación **no atómica**: pueden existir recepciones con PURCHASE pero sin documento fiscal (o al revés, `supplierDocumentError`), o sin PURCHASE (`transactionError`). La anulación debe tolerar esos estados.
- La recepción **no guarda** el id del documento fiscal ni de los pagos; se hallan por `metadata.links.receptionId` y `relatedTransactionId`.
- La CxP contable nace del `PURCHASE` (2.1.01); no hay reglas seed para `SUPPLIER_INVOICE`.

## 2. Referentes existentes

**Anulación de venta** (`void-sale.service.ts`, `POST transactions/sales/:id/void`, `VoidSaleDto{reason ≥3}`): bloquea fiscales y con devoluciones; reingresa stock con `ADJUSTMENT_IN`; crea `VOID_ADJUSTMENT` negativo; marca hijos `VOIDED`; cierra cuotas (las deja `PAID` con marca); ajusta `expected_amount` de caja. Limitaciones que **no** debemos copiar: stock y VOID_ADJUSTMENT se crean **fuera** de la transacción BD; no revierte asientos (el `ADJUSTMENT_IN` genera Dr Inventario / Cr 4.2.01 "Recuperos de mermas", que no es el reverso de la venta); cerrar cuotas como `PAID` ensucia reportes de cobrado.

**Devolución a proveedor** (`purchase-returns.controller.ts`): crea `PURCHASE_RETURN` (Dr 2.1.01 / Cr 1.2.01 + reverso IVA). Brecha: ver G3.

`VoidTransactionCommandHandler` (genérico) solo cambia estado; no toca stock/ledger.

## 3. PMP

- `ProductVariant.pmp` es global por variante. `pmpHistory` (JSON, máx. 500) guarda `{previousPmp,newPmp,transactionId,unitCost,quantity,…}` **solo si el PMP cambió**. Solo `PURCHASE` y `ADJUSTMENT_IN` de producción lo mueven; las salidas no.
- Ventas guardan `unitCost` (snapshot): anular una compra **no** reescribe márgenes pasados.

Reversión:
1. **Seguro**: la entrada de `pmpHistory` del PURCHASE existe y es la **última** del historial de la variante → `pmp = previousPmp` + nueva entrada `source:'void_reception'`.
2. **Hay compras/producción posteriores que movieron el PMP**: no reconstruible exacto (no se guarda stock global previo por entrada). → **bloquear** (o confirmación explícita `acknowledgePmpNotRestored`).
3. **Sin entrada** (PMP no cambió, historial truncado, recepción antigua): PMP sin cambios, con aviso.
- Mejora asociada (G9): guardar `globalStockBefore` en `pmpHistory` para poder recalcular por reproducción en el futuro.

## 4. Contabilidad

| Transacción | Debe | Haber |
|---|---|---|
| `PURCHASE` (por línea) | 1.2.01 Inventario | 2.1.01 Proveedores |
| IVA en PURCHASE (si hay regla) | 1.2.04 | 2.1.01 |
| `SUPPLIER_PAYMENT` confirmado | 2.1.01 | 1.1.01 Caja / 1.1.02 Banco |
| `ADJUSTMENT_OUT` | 5.2.01 Pérdidas | 1.2.01 Inventario |

`LedgerEntry` no tiene estado ni vínculo de reverso; el motor solo hace borrar+regenerar por `transactionId`.

**Decisión recomendada (cambia respecto de v1)**: no crear tipo/enum nuevo ni depender de reglas por compañía. Agregar al motor `postReversalOfTransaction(manager, originalTxId, reversalTxId)`: copia los `LedgerEntry` ya contabilizados del PURCHASE original **invirtiendo debe/haber**, ligados a una transacción de reverso (`VOID_ADJUSTMENT`, que ya existe, con `metadata.origin='RECEPTION_VOID'`), con `metadata.reversalOf`. Ventajas: reverso **exacto** de lo realmente contabilizado (incluido IVA y reglas personalizadas), auditable (el original permanece), sin migración de enum ni reseed. El stock sale con `ADJUSTMENT_OUT` marcado `origin='RECEPTION_VOID'` y el generador de asientos debe **omitirlo** (igual que ya omite `PAYMENT_IN` `pos_sale`) para no registrar una pérdida por merma.
- Descartado: usar `ADJUSTMENT_OUT` sin omitir ledger (registra merma, deja CxP), y borrar asientos (destruye auditoría).
- **[NV]** Si un período contable cerrado bloquea escrituras: `create-transaction.usecase.ts` solo llama `ensurePeriod`. Regla: si el período de la recepción está cerrado → bloquear.

## 5. Mapa de impacto (qué toca la anulación)

| Área | Hoy | Impacto / acción requerida |
|---|---|---|
| **Stock** (`StockLevel`, kardex en `stock-levels.repository.ts`, `inventory.service.ts`) | La dirección IN/OUT se infiere del tipo; los movimientos recientes **no filtran VOIDED** | Salida vía `ADJUSTMENT_OUT` (origin `RECEPTION_VOID`); kardex debe mostrar PURCHASE (IN) y su anulación (OUT) para que el saldo cuadre; etiquetar la fila "Anulación de recepción". Evitar doble conteo |
| **PMP / costos** | §3 | Restaurar según §3; `product-variants.service` (últimas compras) ya excluye VOIDED/CANCELLED: OK |
| **Cuentas por pagar** (`accounts-payable.service.ts`) | Lista `SUPPLIER_PAYMENT` en `DRAFT` pendientes **sin mirar el estado del documento padre** | Si no se anulan las cuotas DRAFT, quedarían **deudas fantasma** vigentes. Se anulan en la misma transacción; además añadir filtro defensivo por padre no `VOIDED` (G5) |
| **Installments** (`installment.service.ts`) | Cuotas PURCHASE solo si hay plan en metadata | Cerrar con estado explícito (no `PAID`) o añadir `CANCELLED` a `InstallmentStatus` (G6) |
| **Caja** (`cash-sessions`, `expected_amount`) | Pagos en efectivo suman a sesión | Con pagos confirmados se **bloquea**; con cuotas DRAFT no hay efecto en caja. Refrescar de todos modos |
| **Cheques** (`checks`) | Cheque nace del pago | Pago con cheque emitido → bloqueado (Fase 2: anular cheque) |
| **Contabilidad** | §4 | Reverso exacto; reportes contables incluyen original + reverso (neto 0) |
| **Reportes compras** (`purchasing-reports`) | Excluyen CANCELLED/VOIDED | OK una vez marcada `VOIDED` la `PURCHASE` **y** el documento fiscal. Revisar que listados de DTE (facturas/boletas proveedor) muestren estado "Anulada" |
| **Reportes inventario** (`inventory-reports`) | Excluyen estados indicados (`EXCLUDED_TX_STATUSES`) | PURCHASE VOIDED desaparece pero el `ADJUSTMENT_OUT` de anulación no: **excluir también `origin='RECEPTION_VOID'`** o mostrar ambos de forma consistente (decisión: mostrar ambos solo en kardex, excluir ambos en reportes de compras) |
| **Analytics / dashboards** (`typeorm-analytics.repository`) | `sumPurchases` excluye VOIDED | OK |
| **Proveedor (ficha)** (`supplier-read-model.query-handler.ts`) | Une `s.receptions` con `r.status = 'PENDING'` | **`Reception` no tiene columna `status`** hoy → el conteo de pendientes es incorrecto/roto (G7). Al agregar `status` (`ACTIVE|VOIDED`) hay que definir bien esa consulta |
| **Devoluciones a proveedor** (`resolveForPurchaseReturn`, `PurchaseReturnNewPageContent`) | Busca recepción por folio sin filtrar estado | Rechazar recepciones `VOIDED`; y al anular, bloquear si ya hay devolución |
| **Reingreso del mismo folio** (`getBySupplierDocumentRef`) | Sin filtro de estado | Excluir `VOIDED` o devolvería la anulada; si no, "corregir" no funciona |
| **Folio proveedor** (`SupplierDocumentFolioGuardService`) | No se usa en recepciones | Hoy se puede ingresar **dos veces la misma factura** (causa raíz del "mal ingresada"): G1. El guard debe ignorar `VOIDED` |
| **Órdenes de compra** | `createFromPurchaseOrder` **no actualiza** estado/recibido de la OC | Al anular no hay nada que revertir, pero es una brecha: la OC nunca se marca recibida (G4). Si se corrige, la anulación debe revertirlo |
| **POS** (`kai-pos` `PosReceptionNewPageClient`, `PosTopBar`) | Crea recepciones con pagos en efectivo de sesión | No se anula desde POS (Fase 1); el POS debe leer estado para no ofrecer acciones sobre anuladas |
| **kai-admin** | `ReceptionsDataGrid`, `ReceptionDetailDialog`, `PurchasingDteDetailDialog`, DTE invoices/receipts grids, `PurchaseReturnNewPageContent`, bulk import | Acción "Anular", badge "Anulada", detalle solo lectura, ocultar acciones (devolución, imprimir) sobre anuladas; DTE grids muestran estado del documento; bulk import: anular no re-abre el lote |
| **kai-store-lite** | `lite-commerce.service` mantiene recepciones **en memoria** (`receptions[]`, no BD) | Fuera de alcance; documentar que no usa este flujo |
| **Señales / SaMI** (`signals`, `buy-now.provider`) | Enlaza a recepciones | Verificar que lecturas de compras excluyan VOIDED **[NV]** |
| **Permisos** | Existe `RECEPTIONS_DELETE` | Reutilizar/crear `RECEPTIONS_VOID` y exigirlo en el endpoint y la UI **[NV]** que el guard por permiso esté aplicado en el controller de recepciones (hoy el controller no usa `@CurrentUser`/`@CurrentCompany`) |
| **Multi-tenant** | `TenantSubscriber` solo rellena `companyId` en INSERT; los SELECT no se filtran | El controller de recepciones **no filtra por compañía** (G2). El void debe filtrar explícitamente por `companyId` |
| **Auditoría** | — | Guardar `voidedBy`, `voidedAt`, `voidReason`; evento/registro en bitácora si existe **[NV]** |

## 6. Reglas de negocio

Estado nuevo en `Reception`: `status` (`ACTIVE` default | `VOIDED`) + `voidedAt`, `voidedBy`, `voidReason`, `voidTransactionId`. Migración con default `ACTIVE`, índice `(company_id, status)`.

`POST /receptions/:id/void { reason }` (≥3 caracteres tras `trim`), con `@CurrentCompany`/`@CurrentUser`:

1. Existe, misma compañía, `status != VOIDED`.
2. **Bloquear** si existe `SUPPLIER_PAYMENT` `CONFIRMED` hijo del documento fiscal o del PURCHASE (dinero movido). Mensaje: anule primero los pagos (Fase 2 los hace anulables). Pagos `DRAFT` (cuotas) se anulan solos.
3. **Bloquear** si hay `PURCHASE_RETURN` (`metadata.links.receptionId` o `relatedTransactionId`) o `SUPPLIER_CREDIT_NOTE` asociados.
4. **Stock**: por variante y bodega, `physicalStock(actual) ≥ cantidad recibida`; si no, **bloquear** con detalle ("ya se consumió/vendió X unidades"). Se descarta solo avisar: dejaría stock negativo o inventario falso. Con stock suficiente se permite (fungible).
5. **PMP** según §3 (bloquear en caso 2).
6. **Período cerrado** → bloquear.
7. Recepción sin PURCHASE (`transactionId` nulo): anular solo el registro y documentos fiscales huérfanos.
8. Concurrencia: dentro de la transacción, `SELECT … FOR UPDATE` sobre `Reception` y `StockLevel`; idempotencia (segunda llamada → 400 "ya anulada").

Efectos, **todos en una única `dataSource.transaction`** (a diferencia de la creación y de `void-sale`):
1. `ADJUSTMENT_OUT` (origin `RECEPTION_VOID`, sin asiento de merma) → stock.
2. Restaurar PMP + `pmpHistory`.
3. `VOID_ADJUSTMENT` + `postReversalOfTransaction` (asiento exacto invertido).
4. Documento fiscal: `status`/`paymentStatus = VOIDED`; cuotas `DRAFT` → `VOIDED`; cuotas `installments` canceladas con estado explícito.
5. `PURCHASE` → `VOIDED` con `metadata.void`; líneas intactas.
6. `Reception.status = VOIDED` + metadatos.
7. Invalidar cachés, `refreshExpectedAmountForSession` si aplica, emitir evento de stock en tiempo real (el handler ya emite `stockRealtime`; la salida debe notificar a POS/kai-stock).

Respuesta: `{ success, reception:{id,status}, voidAdjustmentId, stockAdjustmentId, voidedPaymentIds }` (mismo estilo que venta).

## 7. Brechas encontradas (se incluyen como mejoras)

| # | Brecha | Evidencia | Mejora propuesta | Fase |
|---|---|---|---|---|
| G1 | Se puede ingresar **la misma factura de proveedor dos veces** | `createDirect` no usa `SupplierDocumentFolioGuardService`; `getBySupplierDocumentRef` existe pero no bloquea | Validar unicidad (proveedor + folio + tipo) al crear, ignorando `VOIDED`; el front ya puede avisar con `resolve` | 1 |
| G2 | Recepciones sin filtro de compañía en lecturas | `search`, `getById`, `resolve*`, `getBySupplierDocumentRef` y controller sin `@CurrentCompany` | Filtrar por `companyId` en todas las lecturas/escrituras del módulo | 1 |
| G3 | `PURCHASE_RETURN` aparentemente **no descuenta stock** | `update-stock.action.ts` no lo incluye en entrantes/salientes y no hallé otro handler **[NV]** | Confirmar con prueba; si se confirma, tratarlo como salida (y PMP no cambia) | 1 (verificar) |
| G4 | Orden de compra no se marca recibida | `createFromPurchaseOrder` no actualiza la OC | Registrar cantidades recibidas/estado en la OC y revertirlas al anular | 2 |
| G5 | AP lista cuotas DRAFT sin validar padre | `accounts-payable.service.ts` | Excluir cuotas cuyo padre/PURCHASE esté `VOIDED/CANCELLED` | 1 |
| G6 | Cuotas "canceladas" se marcan `PAID` | `void-sale` y `InstallmentStatus` sin CANCELLED | Agregar estado `CANCELLED` y usarlo en ventas y compras | 2 |
| G7 | Ficha de proveedor filtra `r.status='PENDING'` en una tabla sin esa columna | `supplier-read-model.query-handler.ts` | Definir semántica real de "recepciones pendientes" (p.ej. con error de documento) o quitar el campo | 1 |
| G8 | Creación de recepción no atómica | `createDirect` | Envolver PURCHASE + documento fiscal + pagos en una transacción BD, o registrar `status` de integridad (`INCOMPLETE`) y permitir reintento | 2 |
| G9 | `pmpHistory` no guarda stock global previo | `appendPmpHistory` | Añadir `globalStockBefore` para poder recalcular | 2 |
| G10 | `void-sale` no atómico y no revierte ledger | `void-sale.service.ts` | Reutilizar `postReversalOfTransaction` y una sola transacción también en ventas | 2 |
| G11 | No existe anulación de `SUPPLIER_PAYMENT` | — | Endpoint para anular pagos a proveedor (caja, banco, cheque) para poder anular recepciones ya pagadas | 2 |
| G12 | Edición de recepción inexistente | solo POST | Fuera de alcance: "corregir" = anular + reingresar (acordado). Mejora UX: botón "Anular y reingresar" que precarga el formulario con los datos de la anulada | 2 |

## 8. Riesgos y lo que no se puede revertir de forma segura

1. **Pagos ya ejecutados** (efectivo con caja cerrada, transferencia, cheque cobrado): no revertibles desde aquí → bloqueo (hasta G11).
2. **PMP con compras posteriores**: sin datos para reconstruir exacto → bloqueo o confirmación explícita.
3. **Costo de ventas ya reconocido** con el PMP anterior: no se corrige (documentado).
4. **Período cerrado**: bloqueo; sin esto el reverso alteraría un período cerrado.
5. **Recepciones antiguas sin `pmpHistory`/`storagePhysicalBefore`**: PMP queda sin cambios con aviso.
6. **Concurrencia** stock/anulación simultánea: bloqueos de fila.
7. **Listados y reportes no revisados [NV]** (señales, SaMI, kai-stock, kai-eshop): checklist de verificación antes de liberar; test que recorra cada consumidor con una recepción anulada.

## 9. Plan por fases y pruebas

**Fase 1 (núcleo seguro, valor inmediato)**
- Migración `receptions` (status + metadatos de anulación).
- `ReceptionVoidService` + `POST /receptions/:id/void` + permiso `RECEPTIONS_VOID`.
- `postReversalOfTransaction` en el motor + omisión de ledger para `origin=RECEPTION_VOID`.
- Filtros `VOIDED` en: búsqueda por folio, resolve-for-return, kardex (etiqueta), AP (G5), reportes.
- G1 (folio duplicado), G2 (tenant), G3 (verificar), G7.
- Tests de integración (junto a `receptions.controller.int.spec.ts`): anula sin pagos; stock vuelve; PMP restaurado; ledger neto 0; cuotas DRAFT anuladas y fuera de AP; folio reutilizable; bloqueos (pago confirmado, devolución, stock insuficiente, PMP no restaurable, ya anulada, otra compañía, motivo corto).
- kai-admin: acción "Anular" (Dialog + motivo, Server Action → use case → request, `revalidatePath`), badge "Anulada", detalle solo lectura, acciones ocultas sobre anuladas.

**Fase 2**: G4, G6, G8, G9, G10, G11, G12.

### Decisiones que necesito
1. ¿Aprueban el reverso contable por **espejo de asientos** (§4) en lugar de tipo/reglas nuevas?
2. PMP con compras posteriores: ¿**bloquear** (recomendado) o permitir con aviso?
3. ¿Pagos confirmados bloquean la anulación en Fase 1 (recomendado)?
4. ¿Bloquear si el stock actual es menor al recibido (recomendado)?
5. ¿Incluyen en Fase 1 las brechas G1, G2, G5, G7 (recomendado) o prefieren un PR aparte?
