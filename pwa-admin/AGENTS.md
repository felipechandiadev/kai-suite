<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# pwa-admin — Guía para agentes

## Patrón **«Colección admin»** (CRUD con Server Actions)

**Cómo solicitarlo:** decir *patrón **Colección admin***, *CRUD estilo sucursales*, o *igual que `/settings/branches`*.

**Referencia de código:** `app/(app)/settings/branches/` (página + componentes) y `src/features/settings-branches/` (acciones, capas, types). Detalle de arquitectura: `../docs/legacy/WEBADMIN_INSTRUCTIONS.md` y `.instructions/webadmin.instruction`.

- **Flujo de datos obligatorio:** componentes cliente / RSC → **Server Actions** (`"use server"` en `src/features/{feature}/actions/*.action.ts`) → **use cases** (`application/*.usecase.ts`) → **validación** (Zod en `domain/*.entity.ts`) → **infraestructura** (`infrastructure/*.request.ts`: único lugar de `fetch` a `BACKEND_API_URL` + `Authorization: Bearer …`) → API Nest bajo `/api/...`. **Prohibido** llamar al backend con `fetch` desde componentes cliente, hooks o rutas de solo UI.
- **Carga inicial de la pantalla:** `page.tsx` como **RSC** que obtiene la lista vía una función exportada del `*.action.ts` (p. ej. `listEntitiesForPage()`), que a su vez usa el use case de listado. Usar `export const dynamic = "force-dynamic"` cuando haya **mutaciones** y `revalidatePath` para que la lista se renueve en cada vuelta relevante.
- **Estructura del feature:** `actions/`, `application/`, `domain/`, `infrastructure/`, `types/` (más `utils/` si aplica), nombrado alineado al ejemplo *settings-branches*.
- **Mutaciones (crear / actualizar / eliminar):** una Server Action por operación; invoca al use case; en **éxito** ejecuta `revalidatePath("/ruta/colección", "page")`. En componentes **cliente**, tras éxito suele usarse `router.refresh()` para alinear con el RSC revalidado.
- **Pantalla de colección:** `CollectionPageLayout` + CTA que abre `Create*Dialog` + grid de **tarjetas** con acciones a `Update*Dialog` y `DeleteDialog`. **Búsqueda / filtro** sobre datos ya resueltos en servidor (p. ej. `initial*` + `useSearchParams` y filtro en memoria), salvo requisito explícito de server-side search.
- **Contexto de negocio en servidor:** si hace falta otra entidad (p. ej. `companyId` al crear), resolverlo en el **use case** vía otras clases de `infrastructure` (`CompanyRequest`, etc.), no en componentes.
- Tras implementar una pantalla nueva con este patrón, respetar también las reglas de **UI** (diálogos, copy «Crear» / «Actualizar», `alertArea`, etc.) de la siguiente sección.

## Formato de fechas en la UI admin

- **Solo fecha** (campos de calendario, metadata sin hora, `YYYY-MM-DD`): **`DD/MM/YYYY`** con barras, día y mes con dos dígitos cuando aplique; ejemplo: `03/05/2026`.
- **Fecha y hora** (timestamps, `createdAt`, etc.): **`DD/MM/YYYY HH:mm`** con barras, año de 4 dígitos, hora **24 h**, horas y minutos con dos dígitos; ejemplo: `03/05/2026 11:57`. **No** añadir segundos salvo requisito explícito.
- Interpretar valores en zona **local del navegador** salvo que el producto documente zona fija para esa pantalla.

## UI: diálogos y cards

- **Primitivos compartidos:** importar desde `@kai/ui` (fuente: `packages/ui`). `src/shared/components/` es solo dominio ERP.
- Inventario / limpieza: `npm run ui:audit` — ver `packages/ui/ADAPTACION.md`.

- **Todos** los modales / diálogos deben construirse con el componente compartido `Dialog` (`@kai/ui`).
- **Fila de acciones del `Dialog`:** por defecto **`space-between`** (`actionsJustify="between"`): cancelar/ secundario a la izquierda, primero en `actions`, confirmar/ primario a la derecha, segundo. No redefinir al `end` sin buen motivo.
- **Cabecera del `Dialog`:** no usar el botón de cierre al lado del título; **`showCloseButton` por defecto desactivado** (cierre: backdrop, `Esc`, Cancelar en el pie).
- **Títulos de diálogos de creación:** el `title` (y `aria-label` de controles que abren el diálogo) deben usar el verbo **«Crear …»** (p. ej. `Crear sucursal`, `Crear producto`). **No** usar **«Nueva …»** / **«Nuevo …»** en títulos de creación, para unificar criterio con el botón primario del pie (típicamente «Crear»).
- **Diálogos de actualización de entidad:** el `title`, el `aria-label` de apertura y el **botón primario** del pie deben usar **«Actualizar …»** (p. ej. título `Actualizar sucursal`, CTA `Actualizar`). **No** usar **«Editar …»** en títulos de esos flujos. Los componentes de modal deben nombrarse **`Update*Dialog`** (p. ej. `UpdateBranchDialog`), no `Edit*Dialog`.
- **Alertas y errores en diálogos:** la prop **`alertArea`** renderiza un **bloque propio** (hermano de la fila de botones, no dentro de `actions`); usar el componente **`Alert`**; no poner feedback de envío en `children` (ver `.instructions/webadmin.instruction`).
- Está **prohibido** crear o usar otro enfoque de diálogo (overlays con `fixed` + caja a mano, otra lib de modales, `<dialog>` alternativo, etc.) salvo excepción explícita en el repositorio.
- **IconButton** en **cards** (pies de `Card`, acciones con icono en tarjetas): **solo** `variant="action"` (el `Card` aplica esto a acciones con `icon` + `ariaLabel`).
- **Formularios con `TextField`:** el `placeholder` de cada campo debe ser **el mismo texto que el `label`**; no textos de ejemplo en el placeholder (norma en `webadmin.instruction`).
- **Indicadores de carga (loading):** cualquier UI de carga reutilizable —`loading.tsx` de segmentos, `Suspense` fallback, `dynamic({ loading: ... })`, bloques mientras se obtienen datos, etc.— debe usar el componente compartido **`DotProgress`** (`@kai/ui`). **No** usar `animate-spin` a mano, “skeletons” de spinner custom ni texto solo «Cargando…» sin `DotProgress`, salvo excepción explícita. El **`loading` integrado de `Button`** (icono de spinner en el propio botón) sigue siendo el patrón de ese control.
- Ver también `.instructions/webadmin.instruction` e `../docs/legacy/WEBADMIN_INSTRUCTIONS.md` para el resto de reglas del frontend admin.

## Personas multi-rol (cliente / proveedor / empleado / usuario)

- **Person** es la identidad compartida (`documentNumber` único por empresa). Cliente, proveedor, empleado y usuario de plataforma son **roles** sobre la misma persona.
- Al crear en admin: debounce de documento → `lookupPersonByDocumentAction` (`GET /persons/by-document`). Si ya tiene el rol del diálogo → alert sin CTA y Guardar off. Si existe sin ese rol → campos de persona **read-only** y submit con `personId`.
- Usuarios de plataforma (ADMIN/OPERATOR/COURIER): obligan persona **NATURAL** + documento. SUPER_ADMIN exento. eShop (`eshop_customer_accounts`) es independiente.
- Checkbox empleado ↔ usuario en creates compuestos (`alsoAsEmployee` / `alsoAsUser`).
- Feature UI: `src/features/chile-person/` (`usePersonDocumentLookup`, `PersonDocumentStatusAlert`).
