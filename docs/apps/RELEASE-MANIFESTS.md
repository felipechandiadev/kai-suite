# Release manifests — descarga y versionado de agentes

Manifiestos **tipo B**: no definen el nombre en el launcher; anuncian **qué binario** debe descargar el cliente (POS/admin) y con qué versión.

**Última revisión:** julio 2026  
**Identidad de app (tipo A):** [`NAMING-SUITE.md`](./NAMING-SUITE.md), [`MANIFESTOS-NATIVOS.md`](./MANIFESTOS-NATIVOS.md).  
**Operación publish:** [`packages/kai-printers-release/PUBLISH-CHECKLIST.md`](../../packages/kai-printers-release/PUBLISH-CHECKLIST.md).

---

## 1. Qué son

JSON servidos como estáticos (típicamente bajo `kai-pos/public/downloads/` y espejo en admin si aplica):

| Archivo | Agente |
|---------|--------|
| `kai-printers-android.manifest.json` | Printers APK |
| `kai-printers-windows.manifest.json` | Printers Windows |
| `kai-printers-macos.manifest.json` | Printers macOS |
| `kai-screen-android.manifest.json` | Screen APK |

Ejemplo (Printers Android):

```json
{
  "version": "1.1.14",
  "versionCode": 24,
  "filename": "kai-printers-android-1.1.14.apk",
  "builtAt": "2026-07-29T23:57:06Z"
}
```

- El **manifest JSON se versiona en git**.
- El **binario** (`.apk` / `.dmg` / `.zip`) **no** va a git; se sube al VPS / downloads por rsync.

---

## 2. Relación con identidad

| | Tipo A (identidad) | Tipo B (release) |
|--|--------------------|------------------|
| Pregunta | ¿Cómo se llama la app instalada? | ¿Qué archivo bajar / qué versión hay? |
| Cambia con | Rebrand / rename launcher | Cada publish |
| Ejemplo | `app_name = Kai Printers` | `version = 1.1.14` |

Renombrar `short_name` / `productName` **no** exige cambiar el schema del release manifest; sí puede exigir renombrar `filename` si el artefacto incluye el product name.

---

## 3. Clientes que leen estos manifests

| Cliente npm / UI | Paths típicos |
|------------------|---------------|
| `@kai/print-service-client` | `/downloads/kai-printers-*.manifest.json` |
| `@kai/customer-display-client` | `/downloads/kai-screen-android.manifest.json` |
| POS / Admin settings | páginas de impresión local / customer display |

---

## 4. Checklist al publicar

- [ ] Bump versión en el proyecto nativo
- [ ] Generar artefactos (`npm run kai-printers:publish` o scripts screen)
- [ ] Commit solo `*.manifest.json` (+ `version.properties` si aplica)
- [ ] Rsync binarios al host que sirve `/downloads/`
- [ ] Verificar URL del manifest desde el POS en el ambiente destino

Detalle paso a paso: publish checklist de printers (y análogo screen si existe).
