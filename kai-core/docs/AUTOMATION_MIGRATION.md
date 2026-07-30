# Migration / Rollout — Automation Engine

## Feature flags

- `AUTOMATION_ENGINE_ENABLED`
  - **`true`**: habilita el procesamiento de reglas configurables (AutomationEngine) para `TransactionCreatedEvent`.
  - **default**: `false` (si no está seteada).

> Nota: los listeners legacy de transacciones (stock/cuotas/pagos) fueron removidos del `EventsModule`.
> Contabilidad se mantiene independiente via `AccountingEngineListener`.

## Rollout recomendado

### Fase 0 — Deploy “dark”
- Deploy con:
  - `AUTOMATION_ENGINE_ENABLED=false`
- (Opcional) Cargar reglas en BD sin ejecutarlas aún.

### Fase 1 — Paralelo con simulación
- Activar engine en un ambiente de staging o en una empresa de prueba:
  - `AUTOMATION_ENGINE_ENABLED=true`
- Usar el endpoint `POST /api/automation/rules/test?companyId=...&eventType=TRANSACTION_CREATED` para validar matching y orden.

### Fase 2 — Cutover (engine como fuente de verdad)
- Asegurar reglas seed/CRUD que repliquen comportamiento actual.
- Cambiar flag:
  - `AUTOMATION_ENGINE_ENABLED=true`

### Fase 3 — Limpieza
- Eliminar listeners legacy si ya no se usan.
- (Opcional) agregar trazabilidad (`AutomationRun`) e idempotencia estricta.

