# Diseño: costo de ventas (COGS) en la contabilidad

Estado: **Fase 1 implementada** (v1.33.0). Correcciones al diseño original detectadas al implementar:
- **(c) era un falso positivo**: `unitCost` es costo **por la unidad de la línea** y el total es `unitCost × quantity` (invariante documentada en `inventory-cost-from-line.ts`); el reporte de ventas estaba bien y **no se cambió**. El asiento usa `unitCost × quantity`, no `quantityInBase`.
- **PACK no se excluye** del costo por línea (sus componentes se descuentan sin transacción propia); solo se excluye PREPARADO cuando el stock de terminado no se mueve (salón / retail sin KaiFood), igual que `update-stock`.
- Decisiones asumidas (no se recibió respuesta explícita): cuentas detectadas por código o nombre; histórico sin tocar (Fase 3); costo de PREPARADO por consumo de insumos; línea sin costo = permitir con advertencia.
- Hallazgo adicional corregido: `VoidSaleService.findChildPaymentsWithManager` usaba columnas `company_id`/`transaction_type` inexistentes en `transactions` y fallaba con error 500 al anular cualquier venta (se detectó en la prueba con base real).
- Implementado: columna `accounting_rules.amountBasis`, motor `LINE_COST`, advertencia `LINES_WITHOUT_COST`, `reverseLedgerEntries` en la anulación de venta (el reingreso `SALE_VOID` no genera asiento propio), provisionador idempotente (`npm run accounting:provision-cogs -- --company <id> [--dry-run]`). Fases 2 y 3 siguen pendientes.

Estado original: propuesta. Origen: falencia crítica #1 del análisis ERP.
Verificado leyendo el código (rama `main`, v1.32.1). Lo no verificado se marca **[NV]**.

## 1. Problema

Una venta registra solo el ingreso (Caja/Clientes contra Ingresos). **Nunca** registra el costo de lo vendido ni baja el inventario contable:

- `Inventario` (activo) solo sube con compras y producción; no baja al vender → el activo queda inflado.
- No hay gasto "Costo de ventas" → un estado de resultados desde el mayor muestra utilidad ≈ ventas − gastos operativos, sin el costo de la mercadería.
- Los datos para hacerlo **ya existen**: cada línea de venta guarda `unitCost` (PMP congelado al vender, `resolveFrozenSaleUnitCost`) y `quantityInBase`. Los reportes de ventas ya calculan COGS en SQL, pero eso nunca llega al libro mayor.

## 2. Cómo funciona hoy (evidencia)

- **Motor real**: `LedgerEntriesService.generateEntriesForTransaction` (escucha `transaction.created`). Para cada regla activa del tipo de transacción: alcance `TRANSACTION` → monto `transaction.total`; alcance `TRANSACTION_LINE` → monto `line.total`. **No existe otra base de monto** (no costo).
- `shared/application/AccountingEngine.ts` es un segundo motor (`postTransactionToLedger`) **sin usos**: código muerto que confunde.
- Las reglas son **por compañía y configurables** (`/accounting/rules` en admin). El archivo `accounting-rules.seed.ts` (códigos `1.2.01`, `5.2.01`, …) **no se ejecuta en ningún lado** (TODO en su cabecera); el seed demo usa otro plan (`1000…5101 Costo de mercaderías`). Una instalación sin reglas ni cuentas **no genera asientos** (lo comprobé: la copia de la base demo tenía 0 reglas y 0 cuentas).
- `AccountingRuleLine` (reglas multi-línea con `amountMode` TOTAL/SUBTOTAL/TAX/DISCOUNT/FIXED) existe y tiene CRUD, pero **el motor no la usa**.
- `SALE_RETURN` (seed): contra-ingreso, sin reverso de costo. Anulación de venta: no revierte asientos.

### Hallazgos relacionados (misma raíz)

| # | Hallazgo | Efecto |
|---|---|---|
| a | Consumo de insumos al cerrar una comanda (`ADJUSTMENT_OUT`, `origin=DINING_BACKFLUSH`) y consumo de servicios (`SERVICE_CONSUMPTION`) usan la regla genérica `ADJUSTMENT_OUT` → **Dr Pérdidas y mermas / Cr Inventario** | El costo de la comida se informa como *merma*, no como costo de ventas |
| b | Producción: consumo (`PRODUCTION_CONSUMPTION`, `ADJUSTMENT_OUT`) = merma; resultado (`PRODUCTION_OUTPUT`, `ADJUSTMENT_IN`) = **Dr Inventario / Cr Recuperos de mermas (ingreso 4.2.01)** | Cada lote producido registra un gasto de merma y un ingreso ficticio |
| c | ~~Reporte de ventas calcula COGS como `unitCost × quantity`~~ | **Falso positivo**: es correcto (ver nota de estado) |
| d | Ventas de productos que no mueven stock de terminado (PREPARADO retail/salón, PACK) | Si se aplicara costo por línea se **duplicaría** con el backflush de insumos |

## 3. Propuesta

### 3.1 Motor: base de monto por costo

- Nueva columna `AccountingRule.amountBasis`: `LINE_TOTAL` (default, comportamiento actual) | `LINE_COST`.
- Para `appliesTo=TRANSACTION_LINE` + `LINE_COST`: monto = `round(unitCost × quantity)` (el costo es por la unidad de la línea). Líneas con costo 0/nulo **se omiten** y se registran en `metadata.linesWithoutCost` del asiento (visible para auditoría).
- Se omiten también líneas cuyo producto no mueve stock de terminado (misma función `shouldSkipFinishedGoodsStockForSale` que usa `update-stock`) → evita el doble conteo (d).
- Migración aditiva: `ALTER TABLE accounting_rules ADD amountBasis varchar(20) NOT NULL DEFAULT 'LINE_TOTAL'`. Sin impacto en reglas existentes.

### 3.2 Reglas contables (por compañía)

| Evento | Debe | Haber | Base |
|---|---|---|---|
| `SALE` (por línea) | Costo de ventas | Inventario | `LINE_COST` |
| `SALE_RETURN` (por línea) | Inventario | Costo de ventas | `LINE_COST` (costo de la línea devuelta) |
| `ADJUSTMENT_OUT` `DINING_BACKFLUSH` / `SERVICE_CONSUMPTION` | Costo de ventas | Inventario | total ajuste (valorizado a PMP) |
| `PRODUCTION_CONSUMPTION` / `PRODUCTION_OUTPUT` | Inventario (prod. terminado) | Inventario (insumos) | neutro si hay una sola cuenta de inventario: **no generar asiento** |
| Anulación de venta | espejo de los asientos de la venta | | `reverseLedgerEntries` (ya existe) |

Para (a) y (b) el motor necesita elegir regla según `metadata.origin` (hoy solo por tipo): nuevo campo opcional `AccountingRule.originFilter` (varchar nullable; coincide con `metadata.origin`). Las reglas genéricas (sin `originFilter`) no se aplican a transacciones cuyo origin tenga reglas específicas.

### 3.3 Provisionamiento y configuración

- Script idempotente `accounting:provision-cogs --company <id>`: busca por código/nombre las cuentas "Inventario" y "Costo de ventas" (acepta los planes `1.2.01/5.1.01` y `1200/5101`; si falta alguna, la crea bajo el padre de Gastos), y crea las reglas de la tabla anterior si no existen.
- Admin (`/accounting/rules`): selector "Base del monto" (Total de línea / Costo) y "Origen" en el formulario de reglas.
- Si hay ventas pero no existen cuentas o reglas de costo, el reporte de salud contable muestra una **advertencia** en vez de omitir en silencio.

### 3.4 Histórico

Las ventas anteriores no tienen asiento de costo. Opciones:
1. **No tocar** el pasado (período abierto y cerrado quedan como están). Más simple.
2. **Asiento de ajuste por período abierto** (script único): suma `unitCost × quantityInBase` de las ventas del período no anuladas y genera un asiento Dr Costo / Cr Inventario fechado en el período. Períodos cerrados no se modifican.

## 4. Impacto en la app

| Área | Efecto |
|---|---|
| Libro mayor / balances | Aparecen costo de ventas y baja de inventario; `account-balances` los recalcula al congelar período |
| Estado de resultados / márgenes | Utilidad bruta correcta. Hoy no hay reporte formal: este cambio lo habilita |
| Inventario contable vs físico | Pasa a ser conciliable: `Σ(stock × PMP)` (existe `sumPmpValue`) ≈ saldo de Inventario. Se propone un reporte de conciliación |
| Reportes de ventas (COGS) | Corregir `quantity` → `quantityInBase` (c) |
| Devoluciones de venta | Requieren que la línea devuelta lleve el `unitCost` de la venta original **[NV]** (si no, el costo de la devolución sale a PMP actual) |
| Restaurante/producción | Dejan de ensuciar "Pérdidas y mermas" y "Recuperos de mermas" (a, b) |
| Rendimiento | Una regla más por línea de venta; sin consultas nuevas salvo carga del tipo de producto (ya cargado para stock) |

## 5. Riesgos y casos borde

1. **Compañías sin cuentas/reglas**: no se genera nada (como hoy) → advertencia + script de provisionamiento.
2. **Líneas sin costo** (producto sin PMP ni costo base): costo 0; se listan en metadata y en el reporte de salud. Mejora asociada: bloquear o alertar la venta sin costo (política).
3. **Stock negativo / venta sin existencia**: el costo se registra igual (PMP vigente), pero el inventario físico podría no coincidir con el contable (falencia #3 del análisis).
4. **PMP congelado**: el costo usa el PMP **al vender**; una compra posterior no lo reescribe (correcto). Una anulación de compra con PMP restaurado no corrige ventas pasadas.
5. **Doble conteo** con PREPARADO/PACK: mitigado por la omisión de 3.1; requiere prueba por canal (POS, salón, e-shop, admin).
6. **Reglas existentes**: las nuevas se suman; si una compañía ya modeló costo manualmente, habría que desactivar esas reglas.
7. **Período cerrado**: el asiento nace con la venta; no hay reproceso. El ajuste histórico solo en períodos abiertos.

## 6. Pruebas

- Unitarias del motor: `LINE_COST` con conversión de unidades, línea sin costo, producto que omite stock, devolución, redondeo, regla con `originFilter`.
- Integración (base real, como la anulación de recepciones): venta → asientos de ingreso **y** costo cuadrados; devolución → reverso; anulación → espejo; backflush de comanda → costo de ventas, no merma.
- Conciliación: saldo de Inventario ≈ `Σ stock × PMP` en un escenario con compras y ventas.

## 7. Plan por fases

- **Fase 1**: columna `amountBasis`, motor, reglas SALE/SALE_RETURN, script de provisionamiento, anulación de venta con reverso espejo, corrección del reporte (c), pruebas.
- **Fase 2**: `originFilter` y reclasificación de backflush/servicios/producción (a, b), selector en UI de reglas, advertencias de salud contable, reporte de conciliación de inventario.
- **Fase 3**: ajuste histórico por período (si se aprueba), política de venta sin costo, retirar el motor muerto `AccountingEngine.ts` y decidir el destino de `AccountingRuleLine`.

## 8. Decisiones necesarias

1. ¿El plan de cuentas objetivo es el del seed (`1.2.01`, `5.1.01`) o el de cada compañía? (el script detecta por código/nombre; confirmar nombres).
2. Histórico: ¿no tocar o ajuste por período abierto?
3. PREPARADO/PACK: ¿el costo se reconoce vía backflush de insumos (propuesto) o por la línea vendida?
4. ¿Se aprueba reclasificar el backflush y la producción (Fase 2), que cambia cómo se ve "Pérdidas y mermas" para clientes de restaurante?
5. Venta de línea sin costo: ¿permitir con alerta (propuesto) o bloquear?
