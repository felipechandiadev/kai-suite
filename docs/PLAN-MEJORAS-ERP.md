# Plan estratégico de mejoras del ERP Kai

Estado: **propuesto** (a validar paso a paso). Base: análisis de lógica ERP y trabajo de la sesión (v1.30 → v1.35).
Esfuerzo relativo: **S** ≈ 1–3 días · **M** ≈ 1–2 semanas · **L** ≈ 3+ semanas (estimaciones gruesas, a refinar al diseñar cada paso).

## Principios

1. **Valor visible primero.** La contabilidad está oculta a los usuarios; priorizar lo que el cliente ve y usa (compras, cartera, inventario, rentabilidad).
2. **Primero seguridad de cambio, luego funciones.** Cada paso se prueba con datos reales (copia de BD) antes de subir; los bugs de esta sesión aparecieron así, no con mocks.
3. **Un paso = un ciclo corto:** diseño breve → implementación → prueba con base real → commit local → revisión → subida. Sin mezclar pasos.
4. **Cambios aditivos y reversibles:** migraciones con valores por defecto, funciones por compañía apagadas por defecto cuando alteran contabilidad.
5. **No se sube nada a `main` sin revisión y sin lista de migraciones/guiones a ejecutar.**

## Fase 0 — Cerrar lo pendiente (ahora)

| # | Paso | Entregable | Hecho cuando |
|---|---|---|---|
| 0.1 | Desplegar lo ya subido (v1.31–1.35) | Migraciones `1757730000000` y `1757740000000` aplicadas; kai-core y kai-admin desplegados juntos | Anular recepción, filtros de catálogo/existencias y margen funcionan en producción |
| 0.2 | Limpiar variantes fantasma en producción | `npm run catalog:cleanup-orphan-variants` (dry-run → `--apply`) y revisión de las con stock | Existencias sin filas sin nombre |
| 0.3 | Preguntas abiertas al cliente (obs. 5) | Respuestas a: qué producto no pudo eliminar/modificar, si quiere desactivar o borrar, política con stock | Observación 5 cerrada o re-alcanzada |

## Fase A — Fundación de calidad (antes de seguir creciendo)

| # | Paso | Entregable | Hecho cuando | Esf. |
|---|---|---|---|---|
| A.1 ✅ | **Arnés de pruebas con base real** | Script reutilizable: clona una BD demo a una BD temporal, aplica migraciones, levanta el contexto de la app, ejecuta un escenario y limpia | Un comando corre los escenarios de recepción, venta, anulación y eliminación de producto | M |
| A.2 ✅ | **Escenarios críticos automatizados** | Pruebas de recepción→anulación, venta→anulación, eliminación de producto con/sin stock | Pasan en el arnés y se ejecutan antes de cada subida | M |
| A.3 ✅ | **Control de migraciones** | Prueba que falla si una migración en `src/migrations` no está registrada en `data-source.ts` | Detecta el error que tuvimos con `ReceptionVoid` | S |
| A.4 ✅ | **Sanear fallos preexistentes** | Los 8 tests de `product-variants` y las 4 suites de transacciones/mayor que ya fallaban | 0 fallos en esos módulos | M |

> A.1–A.3 hechos (`npm run test:real-db`, `src/migrations/tests`). Hallazgo de A.3: 6 migraciones antiguas nunca registradas (lista de excepciones en el test; revisar antes de registrar, una elimina columnas). Hallazgo de A.1: el stock se aplica por evento post-commit asíncrono (ver D.3).

> A.4 hecho: 39 → 0 suites fallidas. Se eliminaron 5 suites obsoletas (2 de recepciones con mocks, `accounts-payable-integration` con import inexistente, 2 integraciones sobre SQLite); el flujo de recepciones lo cubre `test:real-db`.

## Fase B — Ciclo de compras completo (valor alto para el cliente)

| # | Paso | Entregable | Hecho cuando | Esf. |
|---|---|---|---|---|
| B.1 ✅ | **Orden de compra con estado de recepción** | Al recibir se actualizan cantidades recibidas y estado (pendiente / parcial / recibida); la anulación de recepción lo revierte | La OC muestra "Recibida 6/10"; anular la recepción restaura | M |
| B.2 ✅ | **Pantalla "Qué comprar"** | Variantes bajo mínimo/reposición agrupadas por proveedor, cantidad sugerida, botón "Crear orden de compra" | Se genera una OC desde la sugerencia | M |
| B.3 ✅ | **Margen en la recepción** | En el ingreso de factura: margen con el costo nuevo y alerta si queda bajo el costo | Se ve el margen antes de guardar | S |
| B.4 ✅ | **Recepción atómica** | Ingreso + factura + pagos en una transacción de BD, o estado "incompleta" con reintento | Un fallo a mitad no deja datos huérfanos | M |
| B.5 ✅ | **Estado visible en compras** | Filtro de estado en Recepciones y estado "Anulada" en Facturas/Boletas proveedor | Se filtra y se ve en las tres grillas | S |

## Fase C — Cartera y rentabilidad (lo que miran los dueños)

| # | Paso | Entregable | Hecho cuando | Esf. |
|---|---|---|---|---|
| C.1 ✅ | **Estado de cuenta + antigüedad de saldos** | Por cliente y proveedor: movimientos, saldo, 0–30 / 31–60 / 61–90 / +90 días | Exportable y consistente con Cuentas por cobrar/pagar | M |
| C.2 ✅ | **Cuotas con estado "Anulada"** | `CANCELLED` en cuotas; reportes no cuentan las anuladas como pagadas | Anular una recepción/venta no altera "pagado" | S |
| C.3 ✅ | **Reportes de rentabilidad** | Utilidad por producto, categoría, cliente y vendedor desde `unitCost` | Cuadra con el margen del catálogo | M |
| C.4 ✅ | **Margen por variante en catálogo** | Detalle expandible con precio, costo y margen por variante; corrección cuando la unidad de venta ≠ unidad de stock | Productos con varias variantes muestran su margen | S |

## Fase D — Integridad de inventario

| # | Paso | Entregable | Hecho cuando | Esf. |
|---|---|---|---|---|
| D.1 ✅ | **Política de stock negativo** | Ajuste por compañía: permitir / avisar / bloquear; corrige la venta que "pierde" el descuento sin registro de stock | Comportamiento definido y probado | M |
| D.2 | **Conciliación de inventario** | Reporte: stock vs. suma de movimientos y valor (stock × PMP) | Detecta y lista descuadres | M |
| D.3 | **Eventos de stock confiables** | Reintento y estado de las actualizaciones de stock hoy post-commit y silenciosas | Un fallo queda visible y se reintenta | M |

## Fase E — Puerta de decisión: contabilidad

**Decisión de producto** (no técnica): ¿se lanzará el módulo contable a clientes?

- **Sí →** ejecutar `accounting-auto-posting-design.md` (Fases 0–3: columnas de estado, servicio idempotente, opt-in por compañía con saldos iniciales, panel de salud) y `cogs-design.md` Fases 2–3 (reclasificar consumo/producción, ajuste histórico). Esf. L.
- **No →** limpiar código muerto (listener sin emisor, `AccountingEngine.ts`, reglas multi-línea sin uso) y mantener el costo de ventas inerte. Esf. S.

## Fase F — Opcionales según el rubro

- **F.1 Lotes y vencimientos** (alimentos): valorización por lote/FIFO, alertas de vencimiento. Esf. L.
- **F.2 Conciliación bancaria** más allá de cheques. Esf. L.

## Orden recomendado y dependencias

```
0.1 → 0.2 → 0.3
      ↓
      A.1 → A.2 → A.3 → A.4        (habilita probar todo lo demás con datos reales)
      ↓
      B.1 → B.2 → B.3 → B.5 → B.4   (B.1 antes de B.2; B.4 al final por ser el más invasivo)
      ↓
      C.2 → C.1 → C.3 → C.4         (C.2 primero: C.1 y C.3 dependen de cuotas correctas)
      ↓
      D.1 → D.2 → D.3
      ↓
      Puerta E → (F según rubro)
```

## Protocolo de cada paso

1. **Diseño breve** (qué cambia, datos, riesgos, criterio de hecho) — para pasos M/L se escribe un documento corto en `docs/`.
2. **Implementación** acotada al paso.
3. **Prueba con base real** (arnés A.1 cuando exista) + typecheck + tests del módulo contra la línea base.
4. **Commit local con versión y tag**; revisión conjunta.
5. **Subida a `main`** con lista de migraciones/guiones a ejecutar y orden de despliegue.

## Riesgos del plan

- Estimaciones gruesas: se ajustan al diseñar cada paso.
- Datos reales del cliente no reproducidos aquí: los pasos 0.2 y D.* deben validarse con una copia de su base.
- Las observaciones del cliente pueden cambiar prioridades; B y C se pueden reordenar sin romper dependencias salvo las marcadas.
