# Flujo completo — Venta (`SALE`) y transacciones derivadas

Este documento describe el flujo end-to-end cuando se crea una **transacción de venta** (`TransactionType.SALE`) y qué **eventos / side-effects** ocurren, junto con las **transacciones derivadas** esperadas en los escenarios más comunes (contado vs crédito, devoluciones y pagos).

> Principio: **`SALE` es una venta (contado o crédito)**. La diferencia se expresa mediante `paymentStatus`, `paymentMethod`, `paymentDueDate` y/o `metadata`.

## 1) Entidades y campos relevantes

### 1.1 `SALE` (Transacción base)
- **Tipo**: `TransactionType.SALE`
- **Pago** (para diferenciar contado vs crédito):
  - `paymentStatus`: `PAID` | `PARTIAL` | `PENDING` | `OVERDUE` | `VOIDED`
  - `paymentMethod`: `CASH` | `CREDIT_CARD` | `DEBIT_CARD` | `TRANSFER` | `CREDIT` | `INTERNAL_CREDIT` | `MIXED` | ...
  - `paymentDueDate`: si existe deuda/vencimiento
  - `amountPaid`, `changeAmount`
  - `metadata`: típicamente detalles de pagos mixtos y/o cuotas
- **Stock**:
  - `storageId` (bodega origen)
  - `lines[]` (líneas con `productVariantId`, `quantity`, `unitCost`, etc.)
- **Vinculación con derivadas**:
  - `relatedTransactionId`: referencia a otra transacción (p. ej. pago asociado a la venta)
  - `parentTransactionId`: jerarquía padre → hijos (si se usa)

### 1.2 Tipos derivados comunes
- `PAYMENT_IN`: cobro a cliente asociado a una venta (especialmente ventas a plazo o pagos posteriores).
- `SALE_RETURN`: devolución asociada a una venta.
- `VOID_ADJUSTMENT`: anulación trazable (si se usa en tu flujo).

## 2) Eventos y “motores” que reaccionan a una venta

Al crear una transacción se publica `TransactionCreatedEvent` (evento de dominio). A partir de ahí existen dos “rutas” de procesamiento:

### 2.1 Contabilidad (independiente)
- **Objetivo**: generar asientos contables para la transacción creada.
- **Reglas**: `AccountingRule` / `AccountingRuleLine` determinan las líneas débito/crédito según tipo, filtros, etc.
- **Ejecución**: listener propio de contabilidad (no depende de automatizaciones).

### 2.2 Automatizaciones de transacciones (configurable por empresa)
- **Objetivo**: ejecutar side-effects operacionales configurables (stock, cuotas, pagos derivados, etc.).
- **Modelo**: `automation_rules` + `automation_actions` (por `companyId` + `eventType`).
- **Motor**: `AutomationEngine` evalúa filtros y ejecuta `actions` por `sortOrder`.

> Importante: **contabilidad NO se configura vía automatizaciones**. Las automatizaciones pueden crear transacciones derivadas y actualizar entidades operativas (stock/cuotas), pero la generación de asientos contables se mantiene separada.

## 3) Flujo “base” al crear una `SALE`

1. **Se crea** la `SALE` (persistencia en `transactions` y `transaction_lines`).
2. Se publica el **evento de dominio**: `TransactionCreatedEvent`.
3. **Contabilidad** procesa `SALE`:
   - Selecciona reglas contables que aplican
   - Genera asientos (ledger entries)
4. **Automatizaciones** (si están habilitadas) procesan `SALE`:
   - Match por `eventType=TRANSACTION_CREATED` + filtros (p. ej. `transactionType=SALE`)
   - Ejecutan acciones en orden:
     - `UPDATE_STOCK`
     - `CREATE_INSTALLMENTS` (si corresponde)
     - `CREATE_DERIVED_TRANSACTION` (si corresponde)

## 4) Escenarios y transacciones derivadas

### 4.1 Venta contado (pagada al momento)
**Definición práctica** (convención sugerida):
- `transactionType=SALE`
- `paymentStatus=PAID`
- `paymentDueDate` vacío o irrelevante

**Derivadas típicas**:
- **(Opcional, según diseño)** `PAYMENT_IN`:
  - Útil si quieres separar “venta” de “cobro” por trazabilidad y conciliación.
  - Se vincula con la venta usando:
    - `PAYMENT_IN.relatedTransactionId = SALE.id`
    - y/o `PAYMENT_IN.parentTransactionId = SALE.id` (si se usa jerarquía)

**Side-effects esperados**:
- Stock: baja por líneas vendidas (acción `UPDATE_STOCK`).
- Contabilidad: asientos de venta (y eventualmente de pago si se registra como transacción separada y/o si tu contabilidad lo requiere).

### 4.2 Venta a crédito (cuenta por cobrar)
**Definición práctica**:
- `transactionType=SALE`
- `paymentStatus=PENDING` o `PARTIAL`
- `paymentDueDate` definido (y/o `paymentMethod=CREDIT|INTERNAL_CREDIT`)

**Derivadas típicas**:
- **Cuotas (installments)**:
  - Si `metadata.numberOfInstallments >= 1` y `metadata.firstDueDate`, se crean cuotas asociadas a la venta.
  - Las cuotas se actualizan cuando ingresan pagos posteriores.

**Pagos posteriores**:
- Cada pago se registra como `PAYMENT_IN` con:
  - `PAYMENT_IN.relatedTransactionId = SALE.id`
  - `PAYMENT_IN.total` = monto pagado
  - `PAYMENT_IN.metadata.paidQuotaId` (opcional) o se aplica a la primera cuota pendiente (según la lógica de actualización).

**Side-effects**:
- Stock: igual que contado (si la venta entrega producto al momento). Si hay despacho diferido, ver 4.4.
- Contabilidad: asientos de venta (CxC). Los pagos generan asientos de cobro cuando se registran.

### 4.3 Venta con pago mixto
**Definición práctica**:
- `transactionType=SALE`
- `metadata.payments[]` (colección canónica; compat `metadata.paymentSnapshots[]` / legacy `paymentDetails[]`)
- `paymentMethod` en columna = medio **representativo** (mayor monto), no `MIXED`
- `paymentStatus=PAID` o `PARTIAL` según suma de pagos

**Derivadas típicas**:
- 1 `PAYMENT_IN` POS con `metadata.payments` copiado de la venta y `metadata.source = 'pos_sale'`
  - `relatedTransactionId = SALE.id`
- Alternativa: múltiples `PAYMENT_IN` (uno por medio), todos con `relatedTransactionId = SALE.id`

**Side-effects**:
- Stock y contabilidad igual que venta contado/crédito, según status final.
- Contabilidad: un **Debe** por línea de `metadata.payments` (caja/banco/clientes según método); el `PAYMENT_IN` POS no genera debe duplicado (`source: pos_sale`).

### 4.4 Venta con entrega diferida (despacho)
Si tu operación requiere separar “venta” de “entrega”, existen dos patrones comunes:

- **Patrón A (simple)**: la `SALE` descuenta stock inmediatamente.
- **Patrón B (fulfillment)**: la `SALE` reserva/compromete stock y la baja real ocurre con una transacción posterior.

En el Patrón B, la derivada típica es una transacción de salida (según tus `TransactionType` existentes):
- `TRANSFER_OUT` / `ADJUSTMENT_OUT` / otro tipo operacional que represente “salida por despacho”.

Vinculación sugerida:
- `DELIVERY_OUT.relatedTransactionId = SALE.id` (si se usa un tipo dedicado)

> Nota: hoy el set de `TransactionType` incluye `INVENTORY_RESERVATION` pero no un “DELIVERY_OUT” dedicado. Si se adopta el Patrón B, conviene formalizar el tipo de salida de despacho.

### 4.5 Devolución de venta (`SALE_RETURN`)
**Cuándo**: devolución total o parcial de una venta.

**Transacción derivada**:
- `SALE_RETURN` con referencia a la venta original:
  - `SALE_RETURN.relatedTransactionId = SALE.id`

**Side-effects**:
- Stock: entrada (reincorporación) de unidades devueltas.
- Contabilidad: asientos inversos o notas según política contable.
- Si hubo pagos: puede existir además un reembolso (`PAYMENT_OUT` o equivalente) o un saldo a favor (según tu diseño).

### 4.6 Anulación / corrección
Si el sistema necesita correcciones trazables sin mutar transacciones:
- `VOID_ADJUSTMENT` puede actuar como “transacción correctiva” vinculada a la original:
  - `VOID_ADJUSTMENT.relatedTransactionId = SALE.id` o `parentTransactionId`

## 5) Reglas recomendadas (resumen)

### 5.1 Convención recomendada para clasificar una venta
- **Contado**: `SALE.paymentStatus=PAID` (y `amountPaid >= total` cuando aplica)
- **Crédito**: `SALE.paymentStatus in (PENDING, PARTIAL)` y/o `paymentDueDate` definido y/o `paymentMethod in (CREDIT, INTERNAL_CREDIT)`

### 5.2 Derivadas mínimas por escenario
- `SALE contado` → (opcional) `PAYMENT_IN` inmediato.
- `SALE crédito` → cuotas + `PAYMENT_IN` posteriores.
- `SALE_RETURN` → siempre referenciar `SALE` original.

## 6) Checklists de implementación / validación

### 6.1 Integridad de vínculos
- Pagos deben referenciar a su venta: `PAYMENT_IN.relatedTransactionId = SALE.id`
- Devoluciones deben referenciar venta: `SALE_RETURN.relatedTransactionId = SALE.id`

### 6.2 Evitar duplicidades
- Contabilidad debe permanecer independiente del motor de automatizaciones.
- Automatizaciones deben enfocarse en stock/cuotas/derivadas (no asientos).

## 7) Venta sin pago (AR) vs crédito interno

**Cuenta por cobrar POS (AR)** — venta `SALE` con `deferPayment` / `paymentStatus: PENDING`, sin `PAYMENT_IN` al emitir. El cobro posterior crea **un** `PAYMENT_IN` con `metadata.source: 'pos_ar_collection'` y `metadata.allocations[]` (varias ventas, varios medios en `metadata.payments`). No usa `INTERNAL_CREDIT` ni `create-multiple-payments` (N transacciones).

**Crédito interno** — flujo distinto (`INTERNAL_CREDIT`, cupo, cuotas). No mezclar medios de encargo ni NC en cobro AR v1.

Endpoints POS: `POST /api/cash-sessions/sales` (`deferPayment: true`) y `POST /api/cash-sessions/collect-pending-sales`.

**Varias ventas por cobro:** un `PAYMENT_IN` puede listar N ventas en `metadata.allocations` (y opcionalmente `relatedTransactionId` en la primera). El listado de transacciones expone `relatedSales[]`; en ventas `SALE`, `relatedSalePayments[]` incluye cobros que referencian esa venta vía allocations o enlace simple.
