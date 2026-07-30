# Documento de trabajo — Guía de desarrollo del informe

Este documento define la **estructura**, el **alcance** y los **contenidos esperados** del informe final (HTML/PDF) a generar con el proyecto `proyecto-reportes/` (Vite + Vivliostyle).

## Objetivo del informe

- **Público objetivo**: cliente final (no técnico).
- **Enfoque**: describir FlowStore y la propuesta desde **funcionalidad** y **UI/experiencia**, evitando detalles internos innecesarios.
- **Resultado**: un documento profesional con secciones claras, imágenes ilustrativas, y un cierre con propuesta de valor y próximos pasos.

## Convenciones (para escribir el informe)

- **Tono**: claro, ejecutivo, sin jerga técnica.
- **Estructura**: cada sección debe poder leerse de forma independiente.
- **Soportes visuales**: capturas/diagramas simples (UI) desde `proyecto-reportes/public/`.
- **Datos**: cuando haya cifras (costos, comisiones), marcar como **referenciales** y/o fuente.

---

## Sección 1 — Introducción

### Propósito
Un breve texto que defina el **alcance del documento**:

- Qué problema se busca resolver (orden, control, cumplimiento, visibilidad).
- Qué incluye el informe (contexto de mercado + propuesta FlowStore + proceso de implementación + servicios + cotización + conclusiones + **glosario de términos**).
- Qué NO incluye (p. ej. detalle técnico profundo, especificaciones de infraestructura del cliente si no están confirmadas).

### Entregables dentro de la sección
- 1–2 párrafos.
- 3–5 bullets con alcance.

---

## Sección 2 — Mercado ERP/POS en Chile (investigación)

### Propósito
Describir la investigación de mercado basada en `@inv_erp.md`:

- Panorama general POS/ERP en Chile (SII, DTE, boleta electrónica).
- **Clasificación por funcionalidades (enfoque obligatorio):** ordenar las alternativas según **qué problema resuelven** y **qué alcance tienen**, no solo por precio. Debe quedar explícito para el lector:
  - cuáles se aproximan a un **ERP o plataforma de gestión amplia** (inventario, sucursales, contabilidad/tesorería, omnicanalidad, etc.);
  - cuáles son **POS / facturación** (caja + emisión DTE y, a lo sumo, módulos acotados de stock o catálogo);
  - cuáles son **terminales / adquirencia** (cobro + boleta/comprobante, con software de gestión periférico o mínimo);
  - cuáles son **modulares / cumplimiento tributario** (partir chico y sumar funciones);
  - cuáles son **pago único / licencia perpetua + hardware**;
  - cuáles son **verticales** (p. ej. **gastronomía** u otro nicho citado en la investigación).
- **TCO comparativo** (costo total de propiedad) por **alternativa de mercado** (marca/tipo de producto), con foco ejecutivo.
- Conclusiones: qué suele valorar el cliente (cumplimiento, soporte, stock, pagos, omnicanalidad).

### Taxonomía funcional recomendada (derivada de `inv_erp.md`)

Usar estas **familias** como ancla (los nombres pueden ajustarse al tono del informe, pero el criterio debe mantenerse):

| Familia | Idea en una frase | Referencias típicas en `inv_erp.md` |
|--------|-------------------|-------------------------------------|
| **Plataforma retail / omnicanal + stock** | POS e inventario fuertes, e‑commerce u omnicanalidad como eje | Bsale (planes estándar/full) |
| **ERP integrado “de gestión”** | POS que alimenta **contabilidad**, tesorería, RRHH u otros módulos corporativos en un mismo ecosistema | Kame ERP |
| **Retail / facturación de mayor complejidad** | Multi‑RUT, exportación, guías, retail denso; integración pagos‑inventario | Laudus |
| **Terminal inteligente + SaaS ligero** | Dispositivo “todo en uno”, cobro central; gestión según plan (catálogo/plus) | Haulmer / **Tuu** |
| **Smart POS / paquete adquirente** | Arriendo o pack de cobro con emisión tributaria asociada al flujo de pago | Transbank Smart POS |
| **Modular / bajo costo** | Pago por módulos; ideal para cumplimiento + escalar después | Lioren |
| **Emisión por tramos / boletas** | Enfoque en volumen de DTE y costo por uso | Facturacion.cl, LibreDTE |
| **Pago único / perpetuo (+ kit hardware)** | Sin (o con poca) mensualidad obligatoria; mantenimiento y actualización en manos del cliente | Puntos de Venta Chile, Eleventa |
| **Vertical gastronomía** | Recetas, insumos, delivery, turnos — costo fijo ± % ventas | Toteat, TAS Chile, Setec Chile (kit) |

**Notas editoriales:**

- Muchas marcas son **híbridas** (p. ej. “POS fuerte” con módulos que se acercan a ERP): en la tabla de clasificación conviene permitir **etiqueta principal + secundaria** o una columna “Comentario de matiz”.
- No forzar etiquetas legales: “ERP” en el mercado se usa de forma laxa; en el informe preferir **“gestión amplia tipo ERP”** vs **“POS + DTE”** cuando la evidencia no sea contundente.
- La taxonomía debe **alimentar** la tabla de TCO: filas comparables deben agruparse o notarse cuando no lo sean (p. ej. terminal + comisiones vs suscripción pura).

### Insumos
- Fuente principal: `inv_erp.md`.

### Entregables dentro de la sección
- Resumen ejecutivo (1 página aprox.).

#### Entregable transversal (obligatorio): clasificación funcional
- **Tabla o matriz** “Alternativa → familia(s) funcional(es) → funciones clave cubiertas (POS, stock, contabilidad, e‑commerce, solo DTE, hardware, comisiones TC, etc.)”.
- Breve texto (medio página) que explique **por qué importa**: un negocio que solo necesita boleta no compite en el mismo problema que uno que requiere **gestión integral** o **multisucursal**.

#### Entregable principal (obligatorio)
- **Tabla de costos por alternativa** (por “marca / tipo de producto”), mostrando **costo acumulado a 12 meses** y **costo acumulado a 24 meses**, en **CLP neto** según el escenario definido en `inv_erp.md` (y dejando explícitos supuestos, p. ej. UF referencial).
- La tabla debe separar, cuando aplique:
  - **solo software/suscripción** (mensualidades + implementación si existe)
  - **costo de adquirencia / comisiones** (si el modelo lo incluye, p. ej. terminales tipo Tuu/Haulmer o pasarelas con comisión)
  - **costo total proyectado** (“TCO”, si se puede calcular con los mismos supuestos)

#### Formato recomendado de la tabla (columnas mínimas)
| Alternativa (marca / tipo) | **Tipo funcional** (familia de la taxonomía) | Modelo de cobro (mensual / UF / equipo + cuota / etc.) | Mes 1 (entrada: impl. + activación) | Mensualidad promedio (Mes 2–12) | **Acumulado 12 meses (CLP neto)** | Mensualidad promedio (Mes 13–24) si cambia | **Acumulado 24 meses (CLP neto)** | Comisiones estimadas (si aplica) | Observaciones (qué incluye: DTE, SKU, sucursales…) |

#### Notas editoriales (deben ir debajo de la tabla)
- **Referencias referenciales**: precios cambian; se toman de `inv_erp.md` y deben marcarse como referenciales.
- **Apples-to-apples**: si dos alternativas no son comparables (p. ej. un modelo es SaaS + otro es kit pago único), agregar una nota “comparación parcial”.
- **Impacto de pagos con tarjeta**: si el modelo incluye comisión variable, agregar un mini-bloque o segunda tabla “escenario de ventas con tarjeta” (porcentaje mensual y ticket), solo si lo soporta el documento sin inventar números.

- 1 tabla adicional opcional: **ranking por TCO 24 meses** (solo filas, sin repetir todas las columnas).
- 3–6 conclusiones accionables (qué significa esto para la decisión del cliente).

---

## Sección 3 — FlowStore

### 3.1 ¿Qué es FlowStore?

#### Propósito
Dar una **definición comercial** del producto, con foco en **ventas** (mensaje para cliente/decisor antes del detalle técnico).

#### Entregables
- 1 párrafo/bloque redactado (valor percibido: cobro, catálogo, circuito hacia back office / cumplimiento).

### 3.2 Introducción (arquitectura explicada para cliente)

#### Propósito
Explicar la solución FlowStore desde una mirada de **producto**:

- FlowStore como plataforma para operar y administrar el negocio.
- Dos aplicaciones que trabajan juntas:
  - **App de Administraciones (Admin)**: configuración, control, reportes.
  - **App POS**: operación diaria en caja/venta.

#### Entregables
- 1 diagrama simple “Admin ↔ POS ↔ Operación” (opcional).
- 1 bloque “Qué resuelve FlowStore” (beneficios).

### 3.3 App de Administraciones (Admin)

#### Propósito
Describir la app Admin **por módulos y pantallas**, siempre desde UI/función:

#### Fuente de verdad (UI real kai-admin)
- Menú lateral + rutas provienen de `kai-admin/src/navigation/mainMenu.ts`.
- Shell superior: `TopBar` (marca/título, usuario, acceso a cambio de clave, etc.) en `kai-admin/app/(app)/AppShellLayoutClient.tsx`.

> Nota editorial: el menú incluye **“UI Components”** (showcase interno). Para el informe al cliente final, normalmente **no** se documenta; puede ir a **Anexos** o quedar fuera.

#### Estructura obligatoria del informe (espejo del menú Admin)
Cada bloque debe tener: **para qué sirve**, **flujo típico**, **capturas** (si aplica), **supuestos** (si requiere datos previos).

##### 3.3.1 Panel
- **Ruta**: `/dashboard`

##### 3.3.2 Ventas
- **Rutas**:
  - **Transacciones**: `/sales/transactions`
  - **Clientes**: `/sales/customers`
  - **Puntos de venta**: `/sales/points-of-sale`
  - **Pagos recibidos**: `/sales/payments`
  - **Sesiones de caja**: `/sales/cash-sessions`
  - **Listas de precios**: `/sales/price-lists`

##### 3.3.3 Compras
- **Rutas**:
  - **Recepciones**: `/purchasing/receptions`
  - **Proveedores**: `/purchasing/suppliers`
  - **Órdenes de compra**: `/purchasing/orders`
  - **DTE’s proveedor**: `/purchasing/dte`  
    - Sub-pestañas dentro del módulo DTE (tabs en UI):
      - Facturas (`/purchasing/dte/invoices`)
      - Boletas (`/purchasing/dte/receipts`)
      - Boletas de honorarios (`/purchasing/dte/honorarium-receipts`)
      - Guías de despacho (`/purchasing/dte/guides`)
      - Notas de crédito (`/purchasing/dte/credit-notes`)
  - **Devoluciones proveedor**: `/purchasing/purchase-returns`

##### 3.3.4 Inventario y Catálogo
- **Rutas**:
  - **Productos**: `/inventory/products`
  - **Categorías**: `/inventory/categories`
  - **Existencias (Stock)**: `/inventory/stock`
  - **Unidades de medida**: `/inventory/units`
  - **Atributos**: `/inventory/attributes`
  - **Almacenes**: `/inventory/storages`

##### 3.3.5 Tesorería
- En el HTML del informe: mismo esquema que Ventas/Compras (**párrafo introductorio del módulo** + **`h5.screen-title`** por pantalla); las figuras **3.13** (`GASTO OPERATIVO.png`) y **3.14** (`ACCOUNTS-BANKS.png`) van tras **Gastos operativos** y **Cuentas bancarias y cajas** respectivamente (Conciliaciones y Flujo de caja no figuran en esa sección).
- **Rutas**:
  - **Gastos operativos**: `/treasury/expenses`
  - **Categorías de gasto**: `/treasury/expense-categories`
  - **Cuentas bancarias y cajas**: `/treasury/accounts`
    - Sub-pestañas (tabs en UI):
      - Cuentas bancarias (`/treasury/accounts/bank`)
      - Cajas (`/treasury/accounts/cash`)
  - **Conciliaciones**: `/treasury/reconciliations`
  - **Flujo de caja (Cash flow)**: `/treasury/cash-flow`

##### 3.3.6 Contabilidad
- En el HTML del informe: mismo esquema que Ventas/Compras (**párrafo introductorio del módulo** + **`h5.screen-title`** por pantalla); figura **3.15** (`TAXES.png`) tras el apartado **Impuestos**.
- En el HTML del informe (cap. 3) **no se mencionan** las pantallas de automatizaciones, flujos, transacciones soportadas ni asientos manuales; existen en la app pero quedan fuera de este documento.
- **Rutas** (informe — alineadas al texto del capítulo 3):
  - **Plan de cuentas**: `/accounting/chart-of-accounts`
  - **Reglas contables**: `/accounting/rules`
  - **Cuentas por cobrar**: `/accounting/accounts-receivable`
  - **Cuentas por pagar**: `/accounting/accounts-payable`
  - **Libros contables**: `/accounting/ledgers`
  - **Impuestos**: `/accounting/taxes`
  - **Estados financieros**: `/accounting/reports`
- **Referencia técnica (no en informe)**:
  - **Automatizaciones**: `/accounting/automation`
  - **Flujos**: `/accounting/flows/sales`
  - **Transacciones soportadas**: `/accounting/transactions`
  - **Asientos manuales**: `/accounting/journal-entries`

##### 3.3.7 RRHH
- En el HTML del informe: mismo esquema que Ventas/Compras (**párrafo introductorio del módulo** + **`h5.screen-title`** por pantalla); en esta versión del capítulo 3 **no hay figura** asociada a RRHH (`proyecto-reportes/public/` no incluye captura de ese módulo).
- **Rutas**:
  - **Empleados**: `/hr/employees`
  - **Remuneraciones**: `/hr/remunerations`
  - **Unidades organizativas**: `/hr/organizational-units`

##### 3.3.8 Configuración
- En el HTML del informe (cap. 3), la tabla de **Configuración** **no incluye** la pantalla de parámetros del sistema (solo Empresa, Sucursales y Usuarios).
- **Rutas** (informe — alineadas a la tabla del capítulo 3):
  - **Empresa**: `/settings/company`
  - **Sucursales**: `/settings/branches`
  - **Usuarios**: `/settings/users`
- **Referencia técnica (no en esa tabla del informe)**:
  - **Parámetros del sistema**: `/settings/parameters`

##### 3.3.9 (Opcional / interno) UI Components
- Showcase de componentes (no orientado al cliente final). Si se incluye, moverlo a **Anexos**. Rutas en `uiComponentItems` dentro de `mainMenu.ts`:
  - Alert (`/ui-components/alert`)
  - Autocomplete (`/ui-components/autocomplete`)
  - Badge (`/ui-components/badge`)
  - Button (`/ui-components/button`)
  - Cards (`/ui-components/cards`)
  - DataGrid (`/ui-components/datagrid`)
  - Dialog (`/ui-components/dialog`)
  - Dot progress (`/ui-components/dot-progress`)
  - Icon Button (`/ui-components/icon-button`)
  - Basic page layout (`/ui-components/basic-page-layout`)
  - Collection page layout (`/ui-components/collection-page-layout`)
  - Tab page layout (`/ui-components/tab-page-layout`)
  - Number stepper (`/ui-components/number-stepper`)
  - Multimedia (`/ui-components/multimedia`)
  - Range slider (`/ui-components/range-slider`)
  - Select (`/ui-components/select`)
  - Switch (`/ui-components/switch`)
  - Tabs (`/ui-components/tabs`)
  - TextField (`/ui-components/textfield`)


#### Imágenes
- Origen: `proyecto-reportes/public/`. En el informe HTML (`content/05-seccion-3-flowstore.html`) la numeración **Figura 3.1–3.17** queda alineada con este orden de archivos:
  - **3.1–3.3 (panel / inicio)**: `DASHBOARD-1.png`, `SIDEBAR.png`, `DASHBOARD-2.png` (esta última figura va textualmente junto al apartado «Panel» 3.3.1)
  - **3.4–3.5** Ventas: `POINT-OF-SALE.png`, `PRICES-LISTS.png`
  - **3.6–3.7** Compras: `RECEPCION.png` (tras apartado Recepciones), `DTE.png` (tras apartado DTE’s proveedor)
  - **3.8–3.12** Inventario y catálogo: `PRODUCTOS.png` (tras apartado Productos), `STOCK.png` (tras Existencias), `UNIDAD.png`, `ATRIB.png`, `STORAGES.png`
  - **3.13–3.14** Tesorería: `GASTO OPERATIVO.png` (tras apartado Gastos operativos), `ACCOUNTS-BANKS.png` (tras Cuentas bancarias y cajas)
  - **3.15** Contabilidad: `TAXES.png` (tras apartado Impuestos)
  - **3.16–3.17** POS (sección 3.4 del informe): `POS.png`, `PAY.png`

#### Entregables
- Sub-secciones por módulo (1–2 páginas c/u máximo).
- Capturas con pie de foto (qué se logra en esa pantalla).

### 3.4 App POS

#### Propósito
Describir la app POS desde el flujo de operación:

- Inicio de sesión / selección de contexto (sucursal, POS, lista de precios).
- Flujo de venta:
  - búsqueda/selección de productos
  - carrito
  - medios de pago
  - emisión de documento (si aplica)
  - cierre / comprobante
- Gestión de caja (apertura/cierre, arqueo, sesiones).

#### Imágenes
- En `proyecto-reportes/public/`: principalmente `POS.png` y `PAY.png` (en el informe armado corresponden a **Figura 3.16** y **Figura 3.17** del capítulo 3).

#### Entregables
- Flujo “paso a paso” con 6–10 bullets.
- Capturas de pantallas clave.

---

## Sección 4 — Proceso de implementación

### Propósito
Describir el proceso completo, con foco en **qué hace el equipo** y **qué necesita del cliente**.

### Etapas

1. **Análisis del contexto de la empresa**
   - Recopilar características operativas y tributarias:
     - régimen/impuestos aplicables
     - sucursales, bodegas, puntos de venta
     - roles/usuarios
     - medios de pago
     - documentos tributarios (DTE) usados
     - catálogo actual (formato, calidad, variantes, códigos)

2. **Configuración de FlowStore + pruebas de configuración**
   - Parametrización según datos del paso 1.
   - Pruebas controladas: flujos principales + validaciones.

3. **Carga de catálogo**
   - Normalización (unidades, categorías, precios, impuestos).
   - Importación inicial.
   - Validación en POS/Admin.

4. **Despliegue de la app en servidor**
   - Preparación de entorno.
   - Deploy y verificación.
   - Criterios de aceptación (checklist).

5. **Capacitaciones y pruebas con usuarios**
   - Sesiones por rol (caja, supervisor, administración).
   - Ejercicios guiados + checklist de dominio.

6. **Actualización de stock**
   - Levantamiento y carga de stock inicial.
   - Validación con conteo selectivo.

7. **Puesta en marcha**
   - Go-live.
   - Monitoreo de primera semana.
   - Mesa de ayuda y ajustes menores.

### Entregables de la sección
- Cronograma sugerido (en semanas) — placeholder.
- Lista de requerimientos al cliente (documentos/datos).
- Checklist de Go-live.

---

## Sección 5 — Servicios

### Propósito
Describir los servicios ofrecidos alrededor de FlowStore (qué incluye, vigencia, modalidad y exclusiones), de modo que queden alineados con la cotización (Sección 6).

> **Nota comercial:** la **licencia de uso**, el **servicio cloud** y el **despliegue** son **servicios independientes**: cada uno con alcance y precio propios en la cotización. Pueden ofrecerse juntos, pero deben poder distinguirse en el informe y en el contrato.

### 5.1 Licencia de uso del software FlowStore

**Servicio independiente.** Otorga el derecho de **uso** de las aplicaciones provistas por el proveedor, con **uso ilimitado** dentro de la vigencia y términos del contrato (operación habitual del negocio):

- **FlowStore — Panel de administración** (PWA Admin).
- **FlowStore — POS / Punto de venta** (PWA POS).

La licencia **no supone por sí sola** la provisión de infraestructura en la nube ni la mano de obra de puesta en producción: corresponden a los servicios **5.2** y **5.3** si se contratan.

### 5.2 Servicio cloud (operación en la nube)

**Servicio independiente.** Operación del entorno productivo en proveedor cloud acordado (típicamente **vigencia anual** u otra definición en propuesta):

- **Servicio de backend (API)** en producción.
- **Servicio de base de datos** gestionado para el proyecto.
- **Publicación y disponibilidad** de las PWA **Panel de administración** y **POS** sobre esa infraestructura.

El detalle debe indicar que **backend y base de datos** forman parte de este **servicio cloud**, no de la licencia (5.1).

### 5.3 Despliegue (puesta en producción)

**Servicio independiente.** Trabajo de **despliegue inicial** (o re‑despliegue acordado): preparación de entorno, despliegue de solución (**aplicación/backend** y **base de datos** según arquitectura), parametrización mínima de entorno, pruebas de humo y verificación post‑despliegue.

### 5.4 Soporte post‑implementación

- Se entrega **6 meses de soporte gratuito** a contar desde la fecha acordada de puesta en marcha (o desde el hito definido en la cotización), salvo que el contrato establezca otra fecha de inicio.
- **Modalidad preferente**: soporte **remoto** (videollamada, acceso acordado, seguimiento por canal definido con el cliente).
- **Visitas en terreno**: si el caso lo requiere, se podrá **coordinar una visita** a las instalaciones del cliente; los costos, disponibilidad y condiciones (desplazamiento, horarios, alcance del trabajo en sitio) se acuerdan por escrito.

### 5.5 Puesta a punto de equipo para punto de venta (POS)

Servicio opcional de **habilitación del equipo** que se utilizará en caja/POS, incluyendo:

- **Formateo** del equipo (borrado seguro según política acordada).
- **Instalación del sistema operativo** y configuración inicial del equipo (drivers básicos, actualizaciones críticas, perfiles de uso).
- **Instalación y acceso** a las PWA en el contexto operativo del local:
  - **PWA POS** en el equipo dedicado al punto de venta.
  - **PWA Admin** cuando corresponda en el mismo equipo o en otro definido con el cliente (navegador, accesos, favoritos, PWA instalada según plataforma).

> Nota: el alcance exacto (número de equipos, marcas/modelos, periféricos, impresoras, redes) debe fijarse en la cotización.

### 5.6 Venta de equipo (CPU / PC)

Se ofrece la **venta de un equipo tipo CPU/PC** (especificaciones a cotizar). **Tras la compra**, el mismo puede ser **configurado** con el servicio descrito en **5.5** (formateo, sistema operativo, acceso e instalación de PWA Admin y PWA POS según lo acordado).

### 5.7 Implementación y parametrización de FlowStore

**Servicio independiente.** Adecuación del sistema al contexto del cliente según lo acordado (alineado con el enfoque de la Sección 4): relevamiento de necesidades, parametrización de empresa/sucursales/usuarios/impuestos y módulos contratados, reglas operativas básicas, pruebas de configuración y criterios de aceptación. No confundir con **despliegue** (5.3) ni con **servicio cloud** (5.2).

### 5.8 Migración y carga inicial (catálogo, stock)

**Servicio independiente.** Trabajo de **normalización**, importación o carga inicial de **catálogo** (productos, precios, unidades, categorías, etc.) y de **existencias/stock** según formatos y calidad de datos entregados por el cliente. Incluye validaciones en Admin/POS cuando corresponda. Alcance (volumen, limpieza de datos, plantillas) se fija en cotización.

### 5.9 Capacitación a usuarios finales

**Servicio independiente.** Sesiones orientadas a roles (caja, supervisión, administración) sobre los flujos contratados: uso de POS, operaciones habituales en el panel de administración, buenas prácticas y checklist de dominio. Modalidad (remoto/presencial), duración y número de sesiones según oferta.

### 5.10 Mantenimiento evolutivo y extensiones

**Servicio independiente (opcional).** Mejoras, nuevos desarrollos o soporte **fuera** del período de soporte gratuito acordado (p. ej. post **5.4**), cotizados por separado.

### Entregables de la sección

- Tabla resumen **Servicio / vigencia / incluye / no incluye / entregables / supuestos** (alinear con Sección 6).
- Definición por escrito de: inicio de los 6 meses de soporte, canales de atención y reglas para visitas en terreno.

---

## Sección 6 — Cotización

### Propósito
Presentar valores y forma de pago, alineados con servicios.

### Contenido esperado (placeholder)
- Ítems cotizados (por etapa/servicio).
- Modalidad de pago (tramos/hitos).
- Condiciones (vigencia, alcance, exclusiones).

### Entregables
- Tabla de costos.
- Términos y condiciones resumidos.

---

## Sección 7 — Conclusiones

### Propósito
Cerrar el documento conectando:

- hallazgos del mercado (Sección 2)
- necesidades del cliente (Sección 4, etapa 1)
- propuesta de valor FlowStore (Sección 3)

### Puntos de valor a reforzar (placeholder)
- Control y visibilidad operacional (venta, caja, stock).
- Cumplimiento y orden documental (según el caso).
- Escalabilidad (sucursales, usuarios, módulos).
- Acompañamiento (implementación + capacitación + soporte).

### Entregables
- 5–10 bullets de cierre.
- Próximos pasos recomendados.

---

## Sección 8 — Glosario de términos

### Propósito

Ofrecer definiciones **breves y en lenguaje de negocio** de palabras y siglas que puedan generar duda en el **lector final no técnico** (dueño de negocio, contador, jefe de tienda, etc.), sin convertirse en manual técnico.

### Momento de elaboración (obligatorio)

El glosario debe **completarse al final del proceso** de redacción del informe: cuando ya esté cerrado el texto de las secciones 1–7, se revisa el documento buscando **jerga**, **siglas** y **conceptos híbridos** (mezcla comercial/técnica) y se agregan entradas hasta que un lector ajeno al proyecto entienda el documento sin consultas externas.

### Criterios de inclusión

- Incluir términos que aparezcan **más de una vez** o que sean **pivote** del argumento (ej. DTE, PWA, diferencia licencia vs cloud).
- Incluir siglas chilenas o del rubro (**SII**, **DTE**, **IVA**, **TCO**, etc.) la primera vez que el informe las use de forma sostenida (o en el glosario si se prefiere no footnotear).
- **No** sobrecargar: sinónimos rutinarios (“empresa”, “cliente”) solo si en el informe adquieren un sentido especial (ej. “cliente” como persona vs “cliente” en contabilidad cuentas por cobrar).

### Formato recomendado en el informe final (HTML/PDF)

- Lista **alfabética** por **lemma** (Palabra o sigla).
- Cada entrada: **Término** + **definición** en 1–3 oraciones.
- Opcional: tabla de dos columnas (`Término` | `Definición`) si el diseño del PDF lo favorece.

### Entregables de la sección

- Mínimo **15–25 entradas** en la versión cliente (ajustar según longitud del informe).
- Cobertura verificada con una pasada de lectura “**como ejecutivo**”: subrayar todo lo que impulse una pregunta; eso debe tener entrada o reescritura en el cuerpo principal.

### Borrador de entradas (ir completando al cerrar el texto)

> Las definiciones siguientes son **guía** para el redactor; pueden acortarse o ajustarse al tono final. Marcar con *pendiente* si el negocio usa un sentido distinto.

| Término | Definición orientativa (placeholder) |
|--------|---------------------------------------|
| **Admin / Panel de administración** | La aplicación FlowStore usada para configurar el negocio, usuarios, inventario, compras, tesorería, etc. (frente al POS, que es la caja). |
| **API / Backend** | La parte “servidor” del sistema: lógica de negocio y datos que hacen funcionar las apps; el usuario no la “ve”, pero la usa al operar Admin o POS. |
| **Base de datos** | Donde se guarda la información del sistema de forma persistente (productos, movimientos, documentos, etc.), servida y respaldada según el contrato de **servicio cloud**. |
| **Catálogo** | Conjunto de productos/servicios cargados en el sistema con precios, impuestos y clasificaciones necesarias para vender y comprar. |
| **Conciliación** | Proceso de **cuadrar** registros bancarios o de medios de pago con lo contabilizado/registrado en el sistema. |
| **Cuentas por cobrar / pagar** | Documentos o saldos pendientes con clientes o proveedores (lo que se debe **cobrar** o **pagar**). |
| **Deploy / Despliegue** | Servicio de **poner en producción** la solución en un entorno accesible para el cliente (no confundir con **implementación** ni con el **servicio cloud**). |
| **DTE** | *Documento Tributario Electrónico*: factura, boleta, nota de crédito, etc., en formato exigido ante el **SII**. |
| **Go-live / Puesta en marcha** | Momento en que el cliente comienza a operar el sistema en condiciones reales (o planificadas) con acompañamiento acordado. |
| **Implementación** | Adaptación y parametrización de FlowStore al negocio del cliente (reglas, datos maestros operativos); no es lo mismo que solo “subir” el software (**despliegue**). |
| **IVA** | Impuesto al Valor Agregado; en el informe suele vincularse a tratamiento de precios y documentos. |
| **Licencia de uso** | Derecho de usar el software FlowStore (Admin y POS) según contrato; **no** incluye por sí sola la infraestructura en la nube (**servicio cloud**) ni el trabajo de despliegue. |
| **POS / Punto de venta** | Aplicación FlowStore orientada a **caja**: venta del día, cobros, sesión de caja, etc. |
| **PWA** | *Progressive Web App*: aplicación que se usa desde el navegador y puede instalarse como acceso en el equipo; aquí aplica a Admin y POS sin instalar un “programa clásico” de escritorio. |
| **SaaS / Nube** | Modelo en el que el software y/o la infraestructura se entregan como **servicio** alojado remotamente (internet), con acceso por usuario. |
| **Servicio cloud** | Prestación de **operación en la nube**: backend, base de datos y publicación de las apps, con vigencia y alcance contratados (**independiente** de la licencia y del despliegue). |
| **Sesión de caja** | Período operativo de una caja/POS (apertura–cierre) usado para ordenar movimientos y arqueos. |
| **SII** | Servicio de Impuestos Internos de Chile; referencia normativa y de documentos electrónicos. |
| **Stock / Existencias** | Cantidades disponibles por producto/bodega para venta o control operativo. |
| **Soporte** | Atención ante dudas e incidentes **post** implementación, en la modalidad acordada (p. ej. remoto, con visitas excepcionales). |
| **TCO** | *Total Cost of Ownership*: costo total de propiedad/proyectado en el tiempo (licencias, equipos, suscripciones, comisiones, implementación, etc., según escenario). |
| *(agregar según el informe)* | *Pendiente: términos que aparezcan en Secciones 2 y 6 (nombres comerciales de competidores solo si aporta claridad).* |

---

## Anexos

### Propósito
Adjuntar material de respaldo.

### Ejemplos de anexos (a definir)
- Cronograma detallado.
- Requerimientos técnicos (si aplica).
- Material complementario (si el glosario principal va en **Sección 8**, no duplicarlo aquí salvo versión extendida).
- Currículum/credenciales del equipo.
- Plantillas de carga de catálogo/stock.

---

## Checklist para comenzar a escribir el informe (operativo)

- [ ] Reunir y seleccionar imágenes para Admin y POS (`proyecto-reportes/public/`).
- [ ] Definir alcance real del cliente (empresa, sucursales, impuestos, DTE, etc.).
- [ ] Elegir estructura final de archivos HTML en `proyecto-reportes/content/`.
- [ ] Completar contenido por sección (primero texto, luego tablas, luego imágenes).
- [ ] Revisar consistencia: términos, nombres de módulos, tono y ortografía.
- [ ] **Cerrar Sección 8 (glosario)** al final: repaso ejecutivo del borrador, nuevas entradas, quitar duplicados y alinear definiciones con lo prometido en servicios/cotización.

