# Decisiones de producto (agente de impresión)

- **Varias líneas mismo `purpose`**: **failover en orden** (`sort_order` ASC). Se intenta la primera impresora del sistema; si falla el envío a spooler, se prueba la siguiente; si todas fallan, el job pasa a `error` tras agotar reintentos del worker.
- **Jobs exitosos**: la fila se **elimina** de SQLite al completar (`DELETE`), no se mantiene historial `done`.
- **Jobs con error**: se **conservan** en DB con `status = error` para diagnóstico y UI de cola.
- **Nombre visible del agente**: **global** en `settings` bajo la clave `agent_display_name`. Cada línea de mapeo puede tener `display_label` opcional (alias de línea); el POS/admin muestran el nombre global en la lista de conectados según protocolo.
