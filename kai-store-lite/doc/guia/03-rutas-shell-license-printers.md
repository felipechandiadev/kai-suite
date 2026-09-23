# 03 — Rutas Shell, Licencia e Impresoras

## Shell (sin path URL de sección)

La sección activa no es una ruta profunda obligatoria: `AppShell` monta:

| Segmento title bar | Monta | Rutas hijas |
|--------------------|-------|-------------|
| POS | `PosRoutes` | `/pos/*` |
| Admin | `AdminRoutes` | `/admin/*` |
| Impresoras | `PrintersRoutes` | `/printers/*` |

Atajos: `Mod+1` POS, `Mod+2` Admin, `Mod+3` Impresoras (`useKeyboardSectionShortcuts`).

Cerrar ventana → hide to tray (`TrayMenuBridge`). Salir → quit + stop sidecar.

---

## Licencia `/license/*`

| Ruta | Page | Objetivo |
|------|------|----------|
| `/license/activate` | `ActivationPage` | Mostrar código instalación; pegar `license.kai` |
| `/license/expired` | `TrialExpiredPage` | Trial vencido; activar o backup |
| `/license/status` | opcional debug | Estado trial/licencia (solo dev) |

### Gate global (`App.tsx` / `LicenseProvider`)

| Estado | Comportamiento |
|--------|----------------|
| `licensed` | App completa |
| `trial` (días > 0) | App completa + badge días |
| `trial_expired` | Solo `/license/*` + backup invoke |
| `invalid_machine` | Como expired; mensaje cambio de PC |

---

## Impresoras `/printers/*`

| Ruta | Page | Objetivo |
|------|------|----------|
| `/printers` | `PrintersHomePage` | Estado servicio print in-process, power |
| `/printers/mapping` | `MappingPage` | Mapeo propósito → impresora |
| `/printers/queue` | `QueuePage` (opcional v1) | Cola jobs |

Invokes (ver `modulos/mod-printers.md` y `modulos/mod-tauri-commands.md`):  
`print_get_status`, `print_set_mapping`, `print_test`, `print_sale_ticket`, etc.

---

## Rutas de arranque

| Condición | Redirect |
|-----------|----------|
| App cold start, sin license decision hydrated | splash → hydrate invoke `license_status` |
| trial_expired / invalid | `/license/expired` |
| licensed/trial + sin JWT | `/admin/login` o `/pos/login` según última sección |
| licensed/trial + JWT + seed pending | onboarding seed (Admin `Backup`/`Seed` interno) |
