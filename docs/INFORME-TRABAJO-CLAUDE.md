# Informe de trabajo: mejoras del ERP y revisión del POS

> **Autoría:** este documento y todo el trabajo que describe fueron realizados por **Claude** (Claude Code, modelo Claude Sonnet 5.5, de Anthropic), a pedido de Felipe Chandia, en la rama `claude/elegant-taussig-dc639a`.
> Cada commit lleva la línea `Co-Authored-By: Claude Sonnet 5.5`.
> **Estado:** todo es local. **Nada se ha subido (push)**; las etiquetas `v1.35.0`…`v1.69.0` existen solo en este repositorio local.
> Fecha del informe: 2026-10-31. Complementa a `PLAN-MEJORAS-ERP.md` (el plan) y `ANALISIS-POS.md` (el primer análisis del POS).

---

## 1. Resumen ejecutivo

1. Se ejecutó el plan estratégico `PLAN-MEJORAS-ERP.md` por fases: **A** (base de pruebas), **B** (compras), **C** (cartera y rentabilidad) y **D** (inventario). Las fases **E** (contabilidad automática) y **F** (opcionales por rubro) quedaron **pendientes por decisión del usuario**.
2. Se analizó en detalle la **app POS** (`kai-pos` y el backend que usa) y se corrigieron fallos de dinero, concurrencia y validación. Se dejó el POS con **0 errores de `tsc` y 0 de ESLint**.
3. Estado de pruebas al cierre: **373 suites / 1734 tests** unitarios en `kai-core` y **24 suites / 59 tests** contra una **base de datos real clonada** (`npm run test:real-db`). En `kai-pos`: 39 suites / 146 tests.
4. Hay **5 migraciones nuevas** que deben aplicarse en producción (sección 5). Una de ellas modifica datos históricos.
5. Lo no verificado o no hecho está listado con honestidad en la sección 8. Ninguna corrección se probó con una caja real ni en el navegador.

---

## 2. Cómo se trabajó

Cada paso siguió el mismo protocolo: diseño breve → implementación → prueba contra una **copia real de la base demo** → commit local con versión y etiqueta → revisión. No se subió nada sin que el usuario lo pidiera.

- **Arnés de pruebas con BD real** (`kai-core/test/real-db/`): clona la base demo con `CREATE DATABASE … TEMPLATE`, corre las migraciones, levanta la aplicación Nest completa y borra la copia al terminar. Ver `kai-core/test/real-db/README.md`.
- **Pruebas de concurrencia:** para cada bloqueo agregado se escribió una prueba que lanza operaciones simultáneas. Cuando fue posible, se comprobó que la prueba **falla sin el arreglo**. Donde no fue posible (la prueba se colgaba o la carrera era muy estrecha) se dice explícitamente en la sección 8.
- **Bloqueos:** se usan `pg_advisory_xact_lock` en una conexión aparte (utilidad común `kai-core/src/common/advisory-lock.util.ts`, más helpers equivalentes en los servicios de caja). Las claves se ordenan para evitar interbloqueos.
- Se respetó el `AGENTS.md` de `kai-admin` y `kai-pos` (primitivos de `@kai/ui`, etc.).

---

## 3. Fases del plan

### Fase A — Base de pruebas (versiones previas a v1.36.0)

| Paso | Resultado |
|---|---|
| A.1–A.3 | Arnés con BD real clonada; escenarios críticos (anular recepción, anular venta, borrar producto, smoke); prueba que verifica que cada migración esté **registrada** en `data-source.ts` (6 migraciones antiguas quedan en una lista de excepciones, pendiente de decisión). |
| A.4 | De 39 suites fallidas a **0**: se actualizaron tests desactualizados y se eliminaron 5 suites obsoletas. Los fallos eran mocks viejos, no bugs. |

### Fase B — Compras

| Versión | Qué se hizo |
|---|---|
| v1.36.0 (B.1) | Estado de recepción de la orden de compra (Parcial/Recibida) con avance recibido/pendiente por línea. |
| v1.37.0 (B.2) | Pantalla «Qué comprar»: sugerencias de reposición por proveedor y creación de la orden de compra. Endpoint `GET /purchase-orders/suggestions`. |
| v1.38.0 (B.3) | Margen y alerta «bajo el costo» en el ingreso de recepción. |
| v1.39.0 (B.5) | Filtro de estado y columna «Anulada» en Recepciones, Facturas y Boletas de proveedor. |
| v1.40.0 (B.4) | Ingreso de recepción atómico: cabecera+líneas en una transacción; si falla el stock se deshace; si falla el documento del proveedor queda «Incompleta» y se puede anular y reingresar. |

### Fase C — Cartera y rentabilidad

| Versión | Qué se hizo |
|---|---|
| v1.41.0 (C.2) | Estado `CANCELLED` en cuotas. Anular una venta o recepción dejaba las cuotas como pagadas; ahora quedan anuladas. **Migración `1757750000000`.** |
| v1.42.0 (C.1) | Antigüedad de saldos por cliente y proveedor con detalle y CSV. Corrige además `isOverdue`/`daysOverdue` de cuotas, que nunca marcaban mora. |
| v1.43.0 (C.3) | Reportes de rentabilidad por producto, categoría, cliente y vendedor. |
| v1.44.0 (C.4) | Costo y margen por variante en el catálogo, con costo convertido a la unidad de venta. |

### Fase D — Inventario

| Versión | Qué se hizo |
|---|---|
| v1.45.0 (D.1) | Política de stock negativo por empresa (permitir / avisar / bloquear, por defecto bloquear). Una venta sin fila de stock ya no «pierde» el descuento. |
| v1.46.0 (D.2) | Conciliación de inventario: stock registrado vs suma de movimientos, con valor del descuadre y CSV. |
| v1.47.0 (D.3) | Actualizaciones de stock idempotentes con registro de fallos y reintento. **Migración `1757760000000`.** |

### Fases E y F — pendientes

- **E (puerta de decisión contable):** requiere decidir si el módulo contable se lanzará a clientes. Recomendación dada: no ejecutar la contabilidad automática sin fecha comprometida; limpiar código muerto si la respuesta es «no».
- **F (opcionales):** lotes y vencimientos; conciliación bancaria más allá de cheques.

---

## 4. Revisión del POS: hallazgos y correcciones

Todos los cambios están en `kai-core` salvo donde se indica `kai-pos`.

| Versión | Área | Hallazgo | Corrección |
|---|---|---|---|
| v1.48.0 | Sincronización offline | Una venta ya entregada se rechazaba por falta de stock; los fallos se guardaban y se devolvían para siempre; reintentos sin fin; ventas online sin protección contra duplicados. | La sincronización no valida disponibilidad; solo las sincronizaciones exitosas se responden desde caché; tope de 5 reintentos automáticos; `clientOperationId` en ventas online y offline. |
| v1.49.0 | Validación de líneas | El servidor aceptaba cantidades/precios/descuentos negativos, costo enviado por el cliente y `userName` del body. | `@IsPositive`/`@Min(0)`; descuento ≤ subtotal; el costo lo fija el servidor; ventas, cobros, encargos y sincronización toman el usuario del token. |
| v1.50.0 | Costos | El costo de venta se guardaba por unidad de stock pero se multiplicaba por la cantidad en unidad de venta. | Se guarda por unidad de la línea. **Migración `1757770000000`** reexpresa el histórico. |
| v1.51.0–v1.54.0 | Calidad de `kai-pos` | Nombres de línea offline con «[object Object]»; llamadas a funciones sin importar; botones con variantes inexistentes; ~70 errores de tipos; 186 de ESLint. | `tsc` y ESLint en 0 errores; `react-hooks/set-state-in-effect` pasa a aviso (decisión del usuario). |
| v1.55.0 | Cierre de caja | El total de ventas de la sesión era `undefined` y sumaba ventas anuladas; dos cierres simultáneos movían el efectivo dos veces; sin conteo físico se trasladaba el total de ventas. | Total numérico sin anuladas; lock por sesión; reintento reutiliza el cierre; sin conteo se cierra con el efectivo esperado. |
| v1.56.0–v1.59.0 | Cobros pendientes | Cobrar dos veces la misma venta/cuota; cobro «a medias» que se repetía. | Lock por documento; el cobro previo incompleto se completa sin cobrar de nuevo. |
| v1.57.0 | Movimientos de caja | Retiros sin verificar saldo, sin sesión abierta ni titular. | Lock de sesión; retiro limitado al efectivo; la sincronización offline no se rechaza por saldo. |
| v1.58.0 | Devoluciones | El monto de la devolución lo fijaba el cliente; se podía devolver una venta anulada. | Tope de monto por lo pagado; sin ventas anuladas; lock por venta. |
| v1.60.0 | Venta | Una venta con pagos menores al total quedaba pagada; descuentos sueltos de hasta 100 %. | Los pagos deben cubrir el total; solo se aceptan descuentos de promociones recalculables. |
| v1.61.0 | Impuestos | El impuesto de cada línea lo calculaba el cliente. | El servidor lo contrasta con las tasas de la variante y de sus precios de lista. |
| v1.62.0 | Salón | Una cuenta se podía cobrar dos veces; cerrar con un `linkedTransactionId` inventado. | Se rechaza cobrar una cuenta cerrada/anulada/con venta vigente; el cierre valida la venta enlazada. |
| v1.63.0 | Encargos | Dos anulaciones simultáneas emitían dos notas de crédito. | Lock por encargo, compartido con su liquidación. |
| v1.64.0 | Preventa | Un ticket se podía canjear dos veces desde cajas distintas. | Lock por ticket. |
| v1.65.0 | Caja chica | Depósitos y retiros sin sesión abierta ni titular. | Verificaciones y lock de sesión. |
| v1.66.0 | Apertura | Aperturas simultáneas creaban sesiones duplicadas; reabrir debitaba otra vez el centro de efectivo. | Lock por POS y centro; la transacción de apertura solo al crear. |
| v1.67.0 | Anular venta | Anulaciones simultáneas restituían el stock dos veces. | Lock por venta (compartido con devoluciones). |
| v1.68.0 | Notas de crédito / recepción | Una nota o un abono se gastaba más de una vez en ventas simultáneas; anular una recepción dos veces descontaba el stock dos veces. | Lock por nota/abono y por recepción. |
| v1.69.0 | Cuotas | `payInstallment` registraba el pago pero **nunca actualizaba la cuota** (el handler que lo hacía no está conectado). | La cuota se actualiza en el mismo paso, bajo lock; actualización idempotente; confirmación de pago a proveedor con comparar-y-fijar. |

---

## 5. Migraciones a aplicar en producción

Orden y efecto:

| Migración | Efecto | Riesgo |
|---|---|---|
| `1757730000000-ReceptionVoid` | Soporte de anulación de recepción (trabajo previo). | Bajo. |
| `1757740000000-AccountingRuleAmountBasis` | Columna `amountBasis` en reglas contables. | Bajo. |
| `1757750000000-InstallmentCancelledStatus` | Agrega `CANCELLED` al enum de cuotas y reclasifica cuotas marcadas «pagadas» por una anulación. **Corre sin transacción.** | Medio: probar antes. |
| `1757760000000-StockEventLogs` | Tabla `stock_event_logs`. | Bajo. |
| `1757770000000-SaleLineUnitCostPerLineUnit` | **Modifica datos históricos:** reexpresa `unitCost` de líneas de venta con conversión de unidades. No es reversible con seguridad. | **Alto: probar antes sobre una copia de producción.** |

Consulta sugerida antes de la `1757750000000`, para saber cuántas cuotas se reclasificarían:

```sql
SELECT count(*) FROM installments
WHERE status='PAID'
  AND (metadata::jsonb ? 'cancelledByReceptionVoid' OR metadata::jsonb ? 'cancelledBySaleVoid');
```

Además, desde la v1.35.0 hay trabajo del usuario en producción pendiente fuera de este informe (por ejemplo `catalog:cleanup-orphan-variants`).

---

## 6. Cambios de comportamiento que el equipo debe conocer

- **Política de stock negativo (D.1):** por defecto **bloquea** la venta sin stock en el POS (igual que antes). Se configura en Configuración → Empresa → Inventario.
- **Pagos obligatorios:** una venta con medios de pago debe cubrir el total; si las promociones del cliente difieren de las del servidor, la venta se rechaza con un mensaje (antes pasaba en silencio).
- **Descuentos:** solo se aceptan los que vengan de una promoción vigente.
- **Impuestos:** el impuesto de líneas gravadas debe coincidir con la configuración del producto.
- **Usuario del token:** ventas, cobros, encargos, aperturas, movimientos de caja y sincronización ignoran el `userName`/`userId` del cuerpo; solo el cierre administrativo puede indicar a otro usuario.
- **Cuotas pagadas desde administración:** ahora se marcan pagadas.
- **Reintentos offline:** tras 5 fallos el comando espera acción manual.
- **Cierre de caja sin conteo:** traslada al centro de efectivo el efectivo esperado, no el total de ventas.

---

## 7. Cómo verificar

```bash
# kai-core
cd kai-core
npx tsc --noEmit -p .
npx jest                 # 373 suites / 1734 tests
npm run test:real-db     # 24 suites / 59 tests, clona la BD demo (kaifood_demo)

# kai-pos
cd kai-pos
npx tsc --noEmit -p .    # 0 errores
npx eslint src           # 0 errores (179 avisos)
npx vitest run           # 39 suites / 146 tests
```

El build de producción de `kai-pos` no se pudo comprobar en este entorno: requiere compilar antes los paquetes del workspace (`@kai/chile-catalogs`, `@kai/fiscal-ted`).

---

## 8. Límites y cosas no verificadas (honestidad)

- **Nada se probó con una caja real ni en el navegador.** Las pantallas nuevas (Qué comprar, Antigüedad, Conciliación, filtros, política de inventario) solo pasaron `tsc`.
- **Pruebas que no demuestran el fallo sin el arreglo:** la carrera de devoluciones simultáneas y la de pago a proveedor no pudieron mostrarse fallando sin el bloqueo (la prueba se colgaba o la ventana era muy estrecha). Sirven como regresión, no como prueba del arreglo. La de canje de ticket de preventa también se colgó sin el bloqueo.
- **Datos históricos sin corregir:** las cuotas pagadas desde administración antes de la v1.69.0 siguen pendientes en producción (su pago existe como transacción). Falta un script de reconciliación; conviene cruzar `PAYMENT_IN` con `metadata.paidQuotaId`.
- **Sin corregir por falta de definición de negocio:**
  - Validar el **precio de lista**, `minPrice` y `maxDiscountPercent` en el servidor.
  - **Quién puede anular ventas** y cerrar cuentas sin cobro (hoy cualquier usuario autenticado).
  - Que un **ticket de preventa** deba coincidir con el carrito cobrado.
- **Sin revisar:** lavandería y delivery (omitidos a pedido), reembolsos con tarjeta, impresión, y otros flujos con el patrón «verificar y luego crear» que pudieran repetirse (pago a proveedores masivo, órdenes de compra).
- **Limitaciones técnicas:** los bloqueos son por clave de aplicación, no restricciones de base de datos; el cobro de una venta y la creación de su pago siguen sin ser una sola transacción (se mitiga con detección de cobro previo incompleto); en `kai-admin` quedan 264 errores de `tsc` ajenos a estos cambios.
- **Clave del CAF en IndexedDB** (riesgo ya documentado en `kai-pos/AGENTS.md`): requiere decisión de seguridad.
- **Versión del agente de impresión** no se muestra en «Acerca de» porque el protocolo no la informa.

---

## 9. Archivos de referencia

- Plan: `docs/PLAN-MEJORAS-ERP.md` (A–D marcadas como hechas).
- Primer análisis del POS: `docs/ANALISIS-POS.md`.
- Arnés de pruebas: `kai-core/test/real-db/` (specs `*.real-spec.ts`).
- Utilidad de bloqueos: `kai-core/src/common/advisory-lock.util.ts`.
- Migraciones: `kai-core/src/migrations/17577[3-7]0000000-*.ts`.

*Documento redactado por Claude (Claude Code, Sonnet 5.5) a pedido de Felipe Chandia.*
