# Diseño: contabilización automática (asientos) de transacciones

Estado: **propuesta para revisión** (sin código de conexión). Origen: hallazgo al probar el costo de ventas (v1.33.0).
Lo no verificado se marca **[NV]**.

## 1. El problema, con evidencia

**Los asientos contables no se generan automáticamente.** Evidencia:

| Evidencia | Resultado |
|---|---|
| `AccountingEngineListener` (`shared/listeners/accounting-engine.listener.ts`) escucha `@OnEvent('transaction.created')` de `EventEmitter2` | **Nadie emite ese evento** (búsqueda en todo `kai-core/src`). El flujo de creación publica `TransactionCreatedEvent` en el **bus CQRS**, que solo consume el handler de stock |
| Única otra ruta: `GenerateLedgerEntriesActionHandler` (automatización) | No está en el `switch` del `AutomationEngine` (solo ejecuta `CREATE_DERIVED_TRANSACTION` y `UPDATE_STOCK`) |
| Comentarios del código (`sales-from-session.service.ts`: *"Transacción atómica + asientos → TransactionsService.createTransaction()"*) | La intención era que `createTransaction` produjera asientos; el cableado se perdió o nunca existió (historial: el listener viene del commit inicial/renombres) |
| Bases locales: `kai_suite_demo` (1.278 transacciones, 12 reglas, 22 cuentas), `kai-demo` (618), `kai_food_demo` (596) | **0 asientos** en todas |

Consecuencia: libro mayor, saldos por cuenta/período, estados contables y las validaciones que dependen del mayor (V1/V2/V4, ver §3) **no tienen datos**. El costo de ventas de la Fase 1 y la anulación con reverso quedan latentes hasta que esto se conecte.

**No se verificó el estado de producción [NV]**: puede haber otro mecanismo (script, proceso externo). Consulta de verificación (solo lectura):
`SELECT count(*) FROM ledger_entries;` · `SELECT "transactionType", count(*) FROM accounting_rules GROUP BY 1;`

## 2. Qué existe hoy

- **Motor** `LedgerEntriesService.generateEntriesForTransaction(tx, companyId, manager?)`: valida, hace *matching* de reglas por tipo, calcula, exige balanza (debe=haber) y persiste. Es **idempotente por rechazo**: si ya hay asientos para la transacción devuelve `REJECTED/DUPLICATE_ENTRIES`.
- **Reglas por compañía** (`accounting_rules`). Los demos traen 12 reglas simples de alcance `TRANSACTION` (SALE, PURCHASE, PAYMENT_IN, SUPPLIER_PAYMENT, EXPENSE_PAYMENT, OPERATING_EXPENSE, aportes, retiros, traspasos).
- **Casos especiales** dentro del motor: PAYROLL (desde metadata), PAYMENT_EXECUTION, depósitos/traspasos de caja, `PAYMENT_IN` de POS (`source=pos_sale`, se omite), cheques.
- **Publicadores de `TransactionCreatedEvent`** (CQRS): `create-transaction.usecase.ts`, `create-transaction.handler.ts` (ambos pueden coexistir: riesgo de doble evento **[NV]**), `complete-payment.usecase.ts`, `complete-supplier-payment.handler.ts`.
- El evento se publica **después** del commit de la transacción, y `TransactionCreatedAutomationHandler` captura y solo registra errores (el stock tiene el mismo patrón).

## 3. Por qué "conectar el listener" sin más sería peligroso

1. **Validaciones previas que dependen del mayor y hoy fallarían:**
   - `CASH_SESSION_OPENING` exige saldo de Caja ≥ monto (V2). Sin saldos iniciales, **todo** apertura de caja se rechazaría.
   - Giros banco→caja (V1) exigen saldo de Banco.
   - `PAYMENT_IN` y `SUPPLIER_PAYMENT` exigen que el monto ≤ deuda calculada desde el mayor (V4): si la compra o venta original no está en el mayor (porque es anterior a la conexión), el pago se rechaza.
   - Estas validan **después** de crear el documento: no impiden la operación, solo dejan el libro incompleto y en silencio.
2. **Orden y completitud**: los asientos dependen unos de otros (deuda → pago). Un backfill debe ir en orden cronológico y desde una fecha de corte con saldos iniciales.
3. **Fallos silenciosos**: handler post-commit + `catch` → logs; no hay reintento ni estado visible.
4. **Estados**: `DRAFT` (cuotas programadas de pago, 52 en el demo), `VOIDED`, `CANCELLED` no deben contabilizarse; los pagos `DRAFT` se contabilizan al confirmarse (`complete-*`).
5. **Métodos contables incompatibles**: los demos cargan `PURCHASE` a **gasto** (5101 Costo de mercaderías; método *periódico*, sin cuenta de Inventario). El costo de ventas por línea (Fase 1) supone método *perpetuo* (compras a Inventario). Aplicar ambos **duplica el costo**. (El provisionador ya se niega si detecta compras a gasto.)
6. **Volumen/rendimiento**: cada venta añade consultas de cuentas/reglas y una transacción; hay que medir.
7. **Páginas de contabilidad del admin** (`/accounting/ledgers`, `journal-entries`, `reports`) empezarán a mostrar datos reales **[NV]** que no se han revisado con datos.

## 4. Diseño propuesto

### 4.1 Servicio de contabilización idempotente
`LedgerPostingService.post(transactionId)`:
- Carga la transacción (con líneas); si el estado no es `CONFIRMED`/`COMPLETED` (según tipo) → `NOT_APPLICABLE`.
- Corre el motor dentro de una transacción de BD y registra el resultado en columnas nuevas de `transactions`:
  `ledgerStatus` (`PENDING` | `POSTED` | `SKIPPED_NO_RULES` | `NOT_APPLICABLE` | `REJECTED`), `ledgerPostedAt`, `ledgerError`, `ledgerAttempts`.
- Idempotente: reintentar sobre `POSTED` no hace nada.

### 4.2 Disparo robusto (dos capas)
1. **Handler CQRS** `@EventsHandler(TransactionCreatedEvent)` (mismo bus que stock): contabiliza de inmediato si la compañía tiene la función activa.
2. **Barredor** (cron como `fiscal-emission-worker`/`tips-due`): reintenta `PENDING`/`REJECTED` (con tope de intentos y backoff) **en orden cronológico**; también sirve para backfill.
   Así un fallo puntual ya no deja el libro incompleto en silencio.

### 4.3 Activación segura por compañía
- Ajuste de compañía `accountingAutoPosting` (default **apagado**) + `accountingStartDate` (fecha de corte) + `inventoryMethod` (`PERPETUAL` | `PERIODIC`).
- Interruptor global `ACCOUNTING_AUTOPOST_ENABLED` (kill switch).
- Transacciones anteriores a la fecha de corte quedan `NOT_APPLICABLE`.

### 4.4 Saldos iniciales
Asistente/script que crea un único asiento de apertura a la fecha de corte desde datos existentes: Caja (sesiones), Banco (`bank-accounts`), Clientes y Proveedores (cuotas/ deuda abierta), Inventario (`Σ stock × PMP`), y la diferencia a Patrimonio (capital/resultados acumulados). Sin esto V1/V2/V4 y los saldos no tienen sentido.

### 4.5 Validaciones: de bloqueantes a advertencias
Por defecto V1/V2/V4 se registran como **advertencias** (`ledgerWarnings` en metadata) y el asiento se genera igual; el modo estricto (`strictLedgerValidation`) queda opcional por compañía. La regla de negocio se aplica al **crear** el documento (donde se puede impedir), no después del commit.

### 4.6 Salud contable (visible para el usuario)
Panel en admin: transacciones por `ledgerStatus`, rechazadas con motivo, tipos con volumen y **sin reglas**, asientos descuadrados, líneas sin costo, y **conciliación de inventario** (`Σ stock × PMP` vs saldo de Inventario). Es lo que convierte el cambio en una mejora que el cliente **ve**.

### 4.7 Anulaciones y limpieza
- Todas las anulaciones usan reverso espejo (`reverseLedgerEntries`): venta ✔, recepción ✔; faltan pagos y otros documentos.
- Retirar el listener muerto, `shared/application/AccountingEngine.ts` (sin usos) y decidir el destino de `AccountingRuleLine`/`GenerateLedgerEntriesActionHandler`.

## 5. Impacto

| Área | Efecto |
|---|---|
| `transactions` | 4 columnas nuevas (migración aditiva) |
| Motor y reglas | Sin cambios de lógica; nuevo orquestador |
| Mayor, saldos, períodos | Pasan a tener datos; `freezeBalancesForPeriod` y cierre de período dejan de trabajar sobre vacío |
| Validaciones V1/V2/V4 | Pasan a advertencia (por defecto) |
| Costo de ventas / anulaciones | Dejan de estar latentes |
| Cuentas por pagar/cobrar y cuotas | No dependen del mayor (siguen en `transactions`/`installments`) |
| Rendimiento | +consultas por transacción (cuentas y reglas se pueden cachear por compañía) **[medir]** |
| Admin | Páginas de contabilidad con datos; nuevo panel de salud |

## 6. Riesgos
- Reglas mal configuradas por compañía (cuentas inexistentes, balanza descuadrada) → `REJECTED`; el barredor no debe reintentar infinito.
- Doble contabilización si coexisten creación vía use case y handler **[NV]**: protegido por la verificación de duplicado, pero conviene confirmar.
- Fecha de corte mal elegida o saldos iniciales incompletos → balances inexactos (por eso va por compañía y con asistente).
- Cierre de períodos: contabilizar movimientos tardíos en períodos cerrados (política: se asientan en el período abierto vigente con marca).

## 7. Fases

- **Fase 0 (sin cambio de comportamiento)**: migración de columnas, `LedgerPostingService`, panel de salud en modo lectura, consulta de diagnóstico y verificación de producción.
- **Fase 1**: ajustes por compañía (apagado por defecto), handler CQRS + barredor, validaciones como advertencia, activación en una compañía piloto con fecha de corte y saldos iniciales.
- **Fase 2**: backfill cronológico asistido, conciliación de inventario, reglas para anulaciones restantes.
- **Fase 3**: modo estricto opcional, limpieza de código muerto, reclasificación de consumo/producción (Fase 2 del costo de ventas).

## 8. Pruebas
Unitarias (estados, idempotencia, barredor con reintentos, fecha de corte), integración con base real (venta, compra, pago, anulación → asientos cuadrados y espejo), prueba de carga básica (N ventas), y una prueba de regresión: con la función apagada, el comportamiento actual no cambia.

## 9. Decisiones necesarias
1. ¿Verificas en producción si ya hay asientos o reglas (consultas de §1)? Cambia el punto de partida.
2. ¿Activación **opt-in por compañía** con compañía piloto (recomendado) o global?
3. ¿Quieres que Kai produzca saldos iniciales automáticos desde los datos existentes (§4.4), o los carga el contador?
4. ¿Validaciones V1/V2/V4 como **advertencia** (recomendado) o bloqueantes?
5. Método contable por defecto para compañías nuevas: ¿perpetuo (inventario como activo, necesario para costo de ventas) o periódico?
