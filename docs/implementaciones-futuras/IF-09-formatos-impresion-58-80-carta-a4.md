# IF-09 · Formatos de impresión — 58 mm, 80 mm, carta y A4

| Campo | Valor |
|-------|-------|
| **ID** | IF-09 |
| **Estado** | Implementado (junio 2026) |
| **Prioridad** | P1 |
| **Última revisión** | junio 2026 |
| **Tareas** | [ROADMAP.md](./ROADMAP.md) |

---

## 1. Resumen ejecutivo

Hoy el ecosistema KaiStore distingue solo **ticket** vs **documento** en algunas pantallas y asume **80 mm** en los agentes de impresión. En retail LATAM coexisten impresoras térmicas de **58 mm** y **80 mm**, y documentos en **carta (US Letter)** o **A4** según país y hardware.

**Objetivo IF-09:** unificar cuatro formatos explícitos en PWAs, cliente WebSocket y agentes (Tauri + Android), con presets de medidas, mapeo a `purpose` del agente y preferencias por tipo de documento.

| Formato (`PrintFormat`) | Uso típico | `purpose` agente | Perfil papel (`PrinterPaperProfile`) |
|-------------------------|------------|------------------|--------------------------------------|
| `ticket_58mm` | Ticket compacto, móviles, 58 mm | `tickets` | `58mm` |
| `ticket_80mm` | Ticket estándar POS | `tickets` | `80mm` |
| `document_letter` | Factura / OC carta (EE.UU., parte LATAM) | `documents` | `letter` |
| `document_a4` | Factura / OC A4 (Chile, Europa) | `documents` | `a4` |

| Capa | Estado junio 2026 |
|------|-------------------|
| `print-service-client` — tipos, presets, selector | ✅ Hecho |
| `pwa-pos` — UI, HTML/PDF, agente local | ✅ Hecho |
| `pwa-admin` — selector 4 formatos, reimpresión | ✅ Hecho |
| `print-service` (Tauri) — `format`, CUPS 48/72 mm, ESC/POS 32/48 | ✅ Hecho |
| `kai-printers-android` (IF-01) — 58/80 + documentos | ✅ Hecho |

---

## 2. Problema que resuelve

- **Operación:** una caja con impresora 58 mm imprimía tickets recortados o con fuente ilegible porque el HTML/PDF se generaba para 80 mm.
- **Documentos:** usuarios con impresora carta no podían elegir A4 (o viceversa) sin cambiar drivers a mano.
- **Agentes:** el campo `purpose` (`tickets` \| `documents`) no basta; el agente necesita saber el **ancho de rollo** o **tamaño de página** para CUPS, Sumatra o ESC/POS.
- **Preferencias:** cada tipo de documento (venta, cotización, arqueo, etc.) puede tener formato distinto; debe persistir en `localStorage` por app.

---

## 3. Modelo de datos

### 3.1 Tipo `PrintFormat`

Fuente de verdad: `packages/print-service-client/src/print-format.ts`.

```ts
type PrintFormat =
  | "ticket_58mm"
  | "ticket_80mm"
  | "document_letter"
  | "document_a4";
```

Helpers públicos: `isTicketPrintFormat`, `isDocumentPrintFormat`, `printFormatToPurpose`, `printFormatToPaperProfile`, `parsePrintFormat`, `describePrintFormat`, `resolvePrintFormat`.

**Migración legacy:** `ticket` → `ticket_80mm`; `document` → `document_a4` (`migrateLegacyPrintMode`).

### 3.2 Presets físicos

`packages/print-service-client/src/print-format-presets.ts` — `PRINT_FORMAT_PRESETS`:

| Formato | Ancho página (mm) | Ancho contenido (mm) | Chars/línea | `@page` CSS |
|---------|-------------------|----------------------|-------------|-------------|
| `ticket_58mm` | 48 | 46 | 32 | `48mm auto` |
| `ticket_80mm` | 72 | 70 | 48 | `72mm auto` |
| `document_letter` | 216 | 190 | — | `letter` |
| `document_a4` | 210 | 186 | — | `A4` |

Usados por: CSS de tickets (`thermal-receipt-ticket-styles.ts`), layout documento (`document-print-format.ts`), raster PDF (`html-to-pdf-base64.ts`).

### 3.3 Protocolo WebSocket (v2.1)

Todo job de impresión desde PWA debe incluir:

```json
{
  "version": "2.1",
  "action": "print",
  "type": "pdf-base64",
  "format": "ticket_58mm",
  "purpose": "tickets",
  "filename": "venta_123.pdf",
  "payload": "JVBERi0xLjQKJ..."
}
```

Reglas (`applyFormatToPrintBody` en `core.ts`):

1. Si `format` está presente, `purpose` se deriva con `printFormatToPurpose` salvo override explícito coherente.
2. Si `format` y `purpose` discrepan → error `format_purpose_mismatch`.
3. Agentes deben leer `format` (o inferir `ticket_80mm` / `document_a4` si ausente, compatibilidad v2.0).

### 3.4 Perfil de impresora en el agente

`PrinterPaperProfile` (`58mm` \| `80mm` \| `letter` \| `a4`) se asigna por línea de mapeo (`purpose` → impresora). El agente valida que el `format` del job sea compatible con el perfil (`formatsMatchProfile`); si no, degradar con log o rechazar según política (TBD en F2 agentes).

---

## 4. Alcance por componente

### 4.1 `print-service-client` (hecho)

- Exporta `PrintFormat`, presets, `PrintFormatSelector`.
- Preferencias POS: `readPosDocumentPrintFormatsFromStorage` / `writePosDocumentPrintFormatsToStorage` por `PosDocumentPrintKind` (`sale`, `quotation`, `backorder`, `customerCreditNote`, `cashClosing`, `cashCountSheet`, `cashSessionOpening`).
- Preferencias admin: mismas APIs con `AdminDocumentPrintKind` (`sale`, `backorder`); storage aún acepta legacy `ticket` \| `document`.

### 4.2 `pwa-pos` (F1 — hecho)

- `PrintFormatSelector` en diálogos de venta, cotización, NC, arqueo, etc.
- Ajustes → Impresión local: formato por tipo de documento + prueba de impresión.
- Generación HTML con CSS por formato; envío al agente vía `htmlToPdfBase64` + `enqueuePos*Ticket` con `format`.

Defaults POS (`DEFAULT_POS_DOCUMENT_PRINT_FORMATS`):

| Documento | Default |
|-----------|---------|
| Venta, cotización, encargo, NC, cierre caja, apertura caja | `ticket_80mm` |
| Hoja conteo efectivo | `document_a4` |

### 4.3 `pwa-admin` (F2 — hecho)

- `PrintFormatSelector` en ajustes de impresión local y flujos de reimpresión (venta, encargo).
- HTML/PDF alineados con presets (`thermal-receipt-ticket-styles`, `document-print-format`).
- Pantalla `/settings/local-printing`: formato por tipo de documento.

### 4.4 `print-service` Tauri (F2 — hecho)

- Lee `format` del job; `ticket_thermal_options_for_job` usa ancho 58/80 mm.
- CUPS: media `Custom.48x…` vs `Custom.72x…`; documentos según PDF generado en PWA.
- ESC/POS nativo: 32 vs 48 columnas vía `escpos_width`.
- UI KaiPrinters: selector de perfil de papel por línea de mapeo; `paperProfileByAlias` en hello/health/config.

### 4.5 `kai-printers-android` (F3 — hecho, ver IF-01)

- Render PDF térmico 58 mm y 80 mm; validación `format` ↔ `paper_profile`.
- Documentos vía Android Print Framework (`document_letter` / `document_a4`).
- Referencia cruzada: [IF-01](./IF-01-kai-printers-android-nativo.md) §4.

---

## 5. UX producto

| Elemento | Comportamiento |
|----------|----------------|
| Selector | Cuatro botones: **58 mm**, **80 mm**, **Carta**, **A4** (`PrintFormatSelector`) |
| Vista previa | Ancho acotado al preset (`previewWidthCss`); documentos a ancho completo del diálogo |
| Impresión local | Si agente conectado → PDF/ticket al `purpose` derivado; si no → `window.print` con `@page` del formato |
| Ajustes | Una fila por tipo de documento; botón “Probar” por fila |
| Etiquetas | `describePrintFormat`: “ticket (58 mm)”, “documento (carta)”, etc. |

---

## 6. Criterios de aceptación

### F1 — POS (cerrado)

1. Usuario elige 58 mm en ticket de venta y la vista previa respeta 46 mm de contenido.
2. Preferencia por documento persiste tras recargar PWA.
3. Job al agente incluye `format` correcto en el JSON.

### F2 — Admin + agentes (cerrado)

4. Admin imprime cotización/venta en carta con el mismo selector que POS.
5. Agente Tauri imprime ticket 58 mm sin recorte en impresora 58 mm configurada (CUPS `Custom.48x…`).
6. Agente rechaza job con `format_printer_mismatch` si `format` no coincide con perfil de la línea mapeada.
7. Kai Printers Android imprime `ticket_80mm` y `ticket_58mm` con perfil BT configurable.

---

## 7. Fases

| Fase | Entregable | Estado |
|------|------------|--------|
| **F0** | `print-service-client` — tipos, presets, selector | ✅ |
| **F1** | POS UI + PDF/HTML por formato | ✅ |
| **F2** | Admin paridad + agente Tauri `format`-aware | ✅ |
| **F3** | Android (IF-01) + validación perfil ↔ formato | ✅ |

---

## 8. Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Jobs viejos sin `format` | Default `ticket_80mm` / `document_a4` en agente |
| ESC/POS 58 mm con fuentes distintas | Perfiles por marca; QA `escpos_qa` con ancho 32 |
| Mezclar carta/A4 en misma impresora | Perfil en mapeo + advertencia en UI |
| Duplicar presets fuera del paquete | Solo `PRINT_FORMAT_PRESETS`; import desde `@flowstore/print-service-client` |

---

## 9. Referencias

- [print_service_app_developer_guide_v2.md](../legacy/print_service_app_developer_guide_v2.md) — §3.4 formatos
- [IF-01 — Kai Printers Android](./IF-01-kai-printers-android-nativo.md)
- `packages/print-service-client/src/print-format.ts`
- `packages/print-service-client/src/print-format-presets.ts`
- `pwa-pos/src/app/(pos)/settings/local-printing/PosLocalPrintPreferencesForm.tsx`

[← Índice](./README.md) · [Roadmap](./ROADMAP.md)
