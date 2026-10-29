# Diseño: anulación de recepciones de compra

Estado: **propuesta para revisión** (no implementada). Origen: observación del cliente "Corregir o eliminar una factura mal ingresada".
Decisión acordada: no borrar físicamente; **anular con motivo obligatorio**. "Corregir" = anular + volver a ingresar.

Todo lo de abajo se verificó leyendo el código en `kai-core` (rama `claude/elegant-taussig-dc639a`, v1.30.0). Donde algo no se pudo verificar se indica.

---

## 1. Qué crea hoy una recepción (`ReceptionsService.createDirect`)

Archivo: `src/modules/receptions/application/receptions.service.ts`.

Secuencia (todo **secuencial y sin transacción de base de datos envolvente**):

1. Guarda `Reception` + `ReceptionLine[]` (`receptions`, `reception_lines`).
2. `maybeCreateStockInTransaction` → `TransactionsService.createTransaction` con `PURCHASE`, `metadata.origin='RECEPTION'`, `metadata.receptionId`. Líneas valoradas al **costo neto** (`unitCost` o `unitPrice`), sin IVA. Guarda `reception.transactionId`.
3. Si `documentType` es `invoice`/`receipt`: `tryCreateReceptionSupplierFiscalDocuments` crea:
   - `SUPPLIER_INVOICE` / `SUPPLIER_RECEIPT` (monto fiscal neto + IVA), `metadata.links.{receptionId, stockInTransactionId}`.
   - Según `supplierDocumentPayment.mode`: hijos `SUPPLIER_PAYMENT` con `relatedTransactionId = documento fiscal`: pagados (`CONFIRMED`, `PAID`; CASH puede llevar `cashSessionId`/`cashHubId`; TRANSFER/CHECK llevan `bankAccountKey`, cheque con `checkData`) o programados (`DRAFT`, `PENDING`, las "cuotas").
   - `recalculateParentPaymentStatus` y refresco de `expected_amount` de la sesión de caja POS.

Efectos secundarios por automatización al crearse el `PURCHASE` (`src/modules/automation/application/handlers/actions/`):

| Acción | Efecto |
|---|---|
| `update-stock.action.ts` | `StockLevel.physicalStock += qtyBase` por variante/bodega; guarda `storagePhysicalBefore/After` en `reception_lines`; **recalcula `ProductVariant.pmp`** (promedio ponderado con `resolvePmpAfterValuedInbound`) y agrega entrada a `pmpHistory` |
| `generate-ledger-entries.action.ts` | Asientos (ver §4) |
| `create-installments.action.ts` | Solo si el PURCHASE trae plan en metadata; la recepción **no** lo envía (el plan vive en `SUPPLIER_PAYMENT` DRAFT) |

Hallazgos importantes del flujo actual:

- **No es atómico**: puede quedar PURCHASE creado y documento fiscal fallido (`supplierDocumentError`) o viceversa. La anulación debe tolerar recepciones "a medias" (sin `transactionId`, sin documento fiscal).
- La recepción **no guarda** el id del documento fiscal ni de los pagos; se encuentran por `metadata.links.receptionId` (documento fiscal) y `relatedTransactionId` (pagos).
- El PURCHASE usa el **neto**; la CxP contable sale del PURCHASE (`2.1.01`), no del `SUPPLIER_INVOICE` (no existen reglas contables seed para `SUPPLIER_INVOICE`; sí para `SUPPLIER_PAYMENT`).

## 2. Cómo se revierte hoy una venta y qué hay para compras

`src/modules/transactions/application/void-sale.service.ts`, endpoint `POST transactions/sales/:id/void` (`VoidSaleDto { reason, min 3 }`):

1. Valida: motivo ≥3, no ya anulada, no borrador, **bloquea ventas con documento fiscal** (BOLETA/FACTURA) y **con devoluciones asociadas**.
2. Reingresa stock con una `ADJUSTMENT_IN` (`metadata.origin='SALE_VOID'`) → pasa por `update-stock`.
3. Crea `VOID_ADJUSTMENT` con montos negativos (guardado directo).
4. En una `dataSource.transaction`: marca pagos hijos `VOIDED`, cierra cuotas abiertas (como `PAID`, con `metadata.cancelledBySaleVoid`), marca la venta `VOIDED` con `metadata.void`, ajusta `cash_sessions.expected_amount`.
5. Revierte promociones, invalida caché.

Notas: los pasos 2–3 quedan **fuera** de la transacción del paso 4 (no atómico). `void-sale` **no revierte asientos contables** explícitamente: el `VOID_ADJUSTMENT` no tiene regla seed, y el `ADJUSTMENT_IN` genera un asiento propio (Dr Inventario / Cr 4.2.01 Recuperos de mermas), que **no es** el reverso del asiento de la venta. Es una limitación del void de ventas que no debemos copiar para compras.

Existe además `VoidTransactionCommandHandler` (genérico, solo cambia estado a `VOIDED` + evento; no toca stock ni contabilidad) y `use-cases/void-transaction.usecase.ts` (crea `VOID_ADJUSTMENT`). Ninguno sirve por sí solo para recepciones.

**Devoluciones a proveedor** (`purchasing-supplier-documents/presentation/purchase-returns.controller.ts`): `POST purchase-returns` crea una transacción `PURCHASE_RETURN` (`metadata.links.receptionId`, `relatedTransactionId`). Regla contable seed: Dr 2.1.01 Proveedores / Cr 1.2.01 Inventario (+ reverso de IVA). **Hallazgo a verificar con el equipo:** `update-stock.action.ts` no incluye `PURCHASE_RETURN` en `incomingTypes` ni `outgoingTypes`, y no encontré otro manejador en `inventory/` ni `transactions/` que descuente stock para ese tipo (`products.service.ts` lo mapea como `'OUT'` solo para listados). Es decir, **es probable que las devoluciones a proveedor hoy no descuenten stock**. No es parte de esta tarea, pero impide usar `PURCHASE_RETURN` como mecanismo de reverso.

## 3. PMP: ¿se puede revertir?

- `ProductVariant.pmp` es un único valor global por variante (no por bodega). `pmpHistory` (JSON, máx. 500 entradas, `helpers/pmp-history.ts`) guarda `{at, previousPmp, newPmp, source, transactionId, storageId, unitCost, quantity}` — **solo cuando el PMP cambió** (si `prev == next` a 2 decimales no se agrega entrada).
- Solo `PURCHASE` y `ADJUSTMENT_IN` con `origin='PRODUCTION_OUTPUT'` mueven el PMP. Las salidas (ventas, `ADJUSTMENT_OUT`) **no** lo mueven, solo la cantidad.
- Las ventas guardan `unitCost` (snapshot del PMP al vender) → anular la compra **no** reescribe márgenes históricos.

Reversión posible, con condiciones:

1. **Caso seguro**: la entrada de `pmpHistory` con `transactionId = PURCHASE de la recepción` existe y es la **última** del historial de esa variante → restaurar `pmp = entry.previousPmp` (y registrar entrada nueva `source: 'void_reception'`). Nadie más movió el PMP desde entonces.
2. **Caso con compras posteriores**: restaurar `previousPmp` sería incorrecto (borra el efecto de compras posteriores). Alternativa: recalcular PMP desde la secuencia de entradas posteriores (reproducir `resolvePmpAfterValuedInbound` omitiendo la anulada). Requiere stock global previo a cada compra, que **no** está en `pmpHistory` (solo `quantity` entrante), y las salidas intermedias alteran la base. **No se puede reconstruir de forma exacta con la información guardada.**
3. **Sin entrada en el historial** (PMP no cambió, o historial truncado a 500, o recepciones anteriores a la introducción del historial): no hay dato; dejar PMP sin cambios y avisar.

Conclusión PMP: **se puede revertir exacto solo en el caso 1**. En los otros se debe o bloquear la anulación o aceptar "PMP no recalculado" con aviso explícito. Se propone bloquear en caso 2 (compra posterior que movió el PMP de alguna variante de la recepción) salvo que el usuario confirme explícitamente (`acknowledgePmpNotRestored`).

## 4. Contabilidad

Asientos por tipo (seed `accounting-rules.seed.ts`; el motor `ledger-entries.service.ts`/`AccountingEngine.ts`):

| Transacción | Debe | Haber |
|---|---|---|
| `PURCHASE` (por línea) | 1.2.01 Inventario | 2.1.01 Proveedores |
| IVA en PURCHASE (si hay regla con tax) | 1.2.04 IVA crédito | 2.1.01 |
| `SUPPLIER_PAYMENT` confirmado | 2.1.01 Proveedores | 1.1.01 Caja / 1.1.02 Banco |
| `PURCHASE_RETURN` | 2.1.01 | 1.2.01 (+ reverso IVA) |
| `ADJUSTMENT_OUT` | 5.2.01 Pérdidas y mermas | 1.2.01 Inventario |

Las entradas (`LedgerEntry`) no tienen estado ni referencia de reverso; el motor solo sabe **borrar y regenerar** por `transactionId` (`postTransactionToLedger`: `ledgerRepo.delete({ transactionId })`, solo si `CONFIRMED`).

Opciones para el reverso:

- **A. `ADJUSTMENT_OUT` por el stock**: baja el stock correctamente, pero contablemente genera Dr 5.2.01 Pérdidas / Cr Inventario — **incorrecto** para una anulación (reconocería una pérdida y dejaría la CxP intacta). No usar sin regla propia.
- **B. Nueva transacción tipo reverso con reglas propias** (p. ej. `PURCHASE_VOID` o `VOID_ADJUSTMENT` con `metadata.voidOfType='PURCHASE'` + regla Dr 2.1.01 / Cr 1.2.01 y reverso de IVA): contablemente limpio y auditable (el asiento original queda y se compensa). Requiere: nuevo enum de tipo (migración de enum Postgres, como `supplier-invoice-enum.bootstrap.ts`), reglas seed + **reglas por compañía ya sembradas en BD** (hay que migrarlas/insertarlas para compañías existentes), y prueba con el motor. Es el camino recomendado, pero es trabajo contable nuevo.
- **C. Borrar los asientos del PURCHASE** (`ledgerRepo.delete`): fácil pero **destruye auditoría** y falla si el período contable está cerrado. No recomendado.
- Período cerrado: `create-transaction.usecase.ts` usa `ensurePeriod`; no verifiqué si bloquea escritura en períodos cerrados. Debe comprobarse: si el período de la recepción está cerrado, **bloquear** la anulación.

## 5. Reglas propuestas

Estado nuevo en `Reception`: `status` (`ACTIVE` default | `VOIDED`) + `voidedAt`, `voidedBy`, `voidReason`, `voidTransactionId` (reverso). Migración: columnas con default `ACTIVE`, índice en `status`.

Validaciones de `POST /receptions/:id/void { reason }` (≥3 caracteres, `trim`):

1. **Existe, de la compañía** (`companyId` del contexto) y `status != VOIDED` → si no, 404/400.
2. **Bloquear si hay pagos al proveedor aplicados** (cualquier `SUPPLIER_PAYMENT` `CONFIRMED` hijo del documento fiscal, o del PURCHASE): hoy implica caja/banco/cheque, y revertir dinero ya movido (sesión de caja cerrada, transferencia ejecutada, cheque cobrado) no es seguro. Mensaje: "anule primero los pagos". *Nota:* hoy no existe un endpoint para anular `SUPPLIER_PAYMENT`; habría que verificarlo/crearlo → posible dependencia.
   - Los `SUPPLIER_PAYMENT` en `DRAFT` (cuotas programadas) **sí se anulan** automáticamente (`status VOIDED`, `paymentStatus VOIDED`).
3. **Bloquear si hay devolución a proveedor** asociada (`PURCHASE_RETURN` con `metadata.links.receptionId` o `relatedTransactionId` = PURCHASE) o nota de crédito proveedor (`SUPPLIER_CREDIT_NOTE`), igual que `void-sale` con `SALE_RETURN`.
4. **Stock consumido**: para cada variante, comparar stock actual de la bodega con lo recibido. **Bloquear si `physicalStock(bodega) < cantidad recibida`** (la mercadería ya salió; descontarla dejaría stock negativo o falsearía inventario). Si alcanza, se permite aunque haya habido ventas de otro lote, porque el stock es fungible. Mensaje con detalle por variante. (Alternativa más permisiva —solo avisar— se descarta: dejaría el inventario y el costo de ventas inconsistentes.)
5. **PMP**: aplicar §3 (restaurar en caso 1; bloquear o exigir confirmación en caso 2).
6. **Período contable cerrado** → bloquear.
7. **Recepción sin PURCHASE** (`transactionId` nulo, falló la creación): permitir anular solo el registro (sin stock/asientos/PMP), marcando `VOIDED`.
8. **Recepciones desde orden de compra** (`type='from-purchase-order'`): la OC probablemente quedó con estado "recibida". **No verifiqué** cómo se actualiza el estado de la OC en `createFromPurchaseOrder`; al anular hay que revertirlo o bloquear. Pendiente de investigar antes de implementar.

Efectos de la anulación (todo en **una** `dataSource.transaction`, a diferencia de la creación):

1. Bajar stock por bodega (movimiento de salida trazable con `metadata.origin='RECEPTION_VOID'`, sin pasar por el asiento de mermas — ver §4B).
2. Restaurar PMP + entrada en `pmpHistory`.
3. Asiento de reverso (§4B).
4. `SUPPLIER_INVOICE`/`SUPPLIER_RECEIPT`: `status=VOIDED`, `paymentStatus=VOIDED`, `metadata.void`; pagos programados `DRAFT` → `VOIDED`; cuotas de `installments` ligadas al PURCHASE (si existen) cerradas con marca `cancelledByReceptionVoid` (mismo patrón que ventas; ojo: ese patrón las deja `PAID`, lo que contamina reportes de pagado — preferible un estado explícito si se agrega).
5. `PURCHASE` original: `status=VOIDED` con `metadata.void`, **sin borrar** líneas.
6. `Reception.status=VOIDED` + metadatos.
7. Invalidar caché; refrescar `expected_amount` de sesión de caja si aplicó.

**Folio reutilizable (clave para "corregir = anular + reingresar")**: `getBySupplierDocumentRef` (`r.reference/documentNumber/dteNumber`) no filtra por estado: al reingresar la misma factura el buscador/validaciones podrían devolver la recepción anulada. Hay que excluir `VOIDED` en `getBySupplierDocumentRef`, `resolveForPurchaseReturn`, listados por defecto y reportes de compras (`purchasing-reports-query.service.ts`, `inventory-reports`: ya filtran algunos `VOIDED`, hay que revisar cada consulta). `SupplierDocumentFolioGuardService.assertUniqueFolio` **no** se usa en la creación desde recepción (solo en gastos operativos); si se usara, debe ignorar `VOIDED`.

## 6. Riesgos y lo que NO se puede revertir de forma segura

1. **Dinero ya pagado**: cualquier pago confirmado (caja cerrada, transferencia, cheque emitido/cobrado) → no revertible desde aquí; se bloquea.
2. **PMP con compras posteriores**: no hay información suficiente para reconstruir el PMP exacto (§3 caso 2). Bloqueo o aceptación explícita de PMP desactualizado.
3. **Asientos contables**: no existe infraestructura de reversos; la opción correcta (§4B) requiere tipo de transacción y reglas nuevas, incluyendo reglas ya sembradas en compañías existentes. Sin esto, la anulación dejaría el balance inconsistente.
4. **Stock multi-bodega/ventas ya realizadas**: costo de ventas ya calculado con el PMP antiguo no se corrige (comportamiento aceptable, pero debe documentarse).
5. **No atomicidad de la creación**: recepciones en estado intermedio (con PURCHASE pero sin documento fiscal o viceversa) exigen ramas defensivas.
6. **Concurrencia**: dos anulaciones simultáneas o anulación mientras se vende ese stock → bloqueo de fila (`FOR UPDATE`) sobre `Reception` y `StockLevel` dentro de la transacción.
7. **Brecha preexistente en `PURCHASE_RETURN`** (§2): no descuenta stock aparentemente; anular una recepción con devolución está bloqueado, pero la devolución en sí podría estar mal. Fuera de alcance, conviene abrir ticket.
8. **Tests preexistentes**: `src/modules/product-variants` tiene 8 fallos ajenos; el módulo de PMP/stock requiere pruebas propias del void.

## 7. Recomendación y alcance de implementación

No se implementó código en esta tarea porque quedan dos puntos que **no son seguros de resolver sin una decisión**:

1. **Contabilidad (§4B)**: crear tipo/regla de reverso (migración de enum + reglas por compañía). Necesita aprobación contable.
2. **PMP (§3)**: elegir política cuando hay compras posteriores (bloquear vs. aceptar PMP desactualizado).

Plan sugerido si se aprueba:

- **Fase 1 (MVP seguro)**: `POST /receptions/:id/void` con bloqueos de §5 (pagos confirmados, devoluciones/NC, stock insuficiente, PMP no reversible exacto, período cerrado), reverso contable §4B, estado `VOIDED`. UI: acción "Anular" en el menú `...` de `ReceptionsDataGrid`, Dialog con motivo, badge "Anulada", detalle solo lectura. Pruebas de integración junto a `receptions.controller.int.spec.ts`.
- **Fase 2**: anulación de pagos a proveedor (para poder anular recepciones ya pagadas), recálculo de PMP por reproducción, estado explícito de cuotas.

### Decisiones que necesito del usuario

1. ¿Aprueban crear el tipo de transacción de reverso de compra con reglas contables propias (§4B)?
2. Con compras posteriores que movieron el PMP: ¿**bloquear** (recomendado) o permitir dejando el PMP sin recalcular con aviso?
3. ¿Recepciones con pagos confirmados quedan **bloqueadas** en esta fase (recomendado)?
4. ¿Se acepta bloquear cuando el stock actual es menor al recibido?
