# Descargas agentes locales (POS)

Archivos estáticos servidos en **`/downloads/`** por la PWA del POS (`/settings/local-printing`).

## Publicar todas las plataformas (comando único)

Desde la **raíz del monorepo**:

```bash
npm run kai-printers:publish
```

Publica en `pwa-pos/public/downloads/`:

| Plataforma | Artefacto | En git |
|------------|-----------|--------|
| Android | `kai-printers-android-{version}.apk` | No |
| Windows | `kai-printers-windows-{version}-x64-portable.zip` | No |
| macOS | `kai-printers-macos-{version}-aarch64.dmg` | No |
| Manifests JSON | `kai-printers-*.manifest.json` | Sí |

Requisitos:

- **Android:** `kai-printers-android/` (Gradle + keystore release).
- **Desktop:** `kai-printers-desktop/` (Tauri; carpeta local, no siempre en git).

### Flags útiles

```bash
# Recompilar desktop antes de copiar
npm run kai-printers:publish -- --build

# Solo una plataforma
npm run kai-printers:publish -- --android-only
npm run kai-printers:publish -- --desktop-only
npm run kai-printers:publish -- --windows-only
npm run kai-printers:publish -- --macos-only

# Subir versión Android (patch / minor / code-only)
npm run kai-printers:publish -- --bump patch
```

Comandos por plataforma (legacy / avanzado):

```bash
npm run kai-printers:publish:android
npm run kai-printers:publish:desktop
```

---

## Deploy al VPS (flujo recomendado)

Los **binarios no van en git** (`.gitignore`). Con `git pull` en el VPS solo llegan los **manifest JSON** y el código; los `.apk` / `.zip` / `.dmg` hay que copiarlos aparte.

### 1. Publicar en tu máquina de desarrollo

```bash
npm run kai-printers:publish
# opcional: npm run kai-printers:publish -- --build
```

Verificá localmente:

- http://localhost:5032/settings/local-printing
- http://localhost:5032/downloads/kai-printers-android.manifest.json
- http://localhost:5032/downloads/kai-printers-android-{version}.apk

### 2. Commit y push (solo manifests + metadatos)

```bash
git add pwa-pos/public/downloads/kai-printers-*.manifest.json
# si bump Android:
git add kai-printers-android/version.properties
git commit -m "chore(printers): actualizar manifests Kai Printers"
git push
```

No commitees `.apk`, `.zip` ni `.dmg`.

### 3. Pull en el VPS

```bash
cd /ruta/al/repo/kai
git pull
```

### 4. Copiar binarios al VPS (rsync)

Desde tu máquina local (ajustá usuario, host y ruta):

```bash
rsync -avz pwa-pos/public/downloads/ \
  usuario@tu-vps:/ruta/al/repo/kai/pwa-pos/public/downloads/
```

Incluye manifests y binarios. Si ya hiciste `git pull` en el VPS, el rsync asegura que los artefactos grandes estén presentes.

### 5. Verificar en producción

Abrir en el navegador (reemplazá el dominio):

- `https://pos.tu-dominio.cl/downloads/kai-printers-android.manifest.json`
- `https://pos.tu-dominio.cl/downloads/kai-printers-android-{version}.apk`

Luego **Configuración → Impresión local → Descargar Kai Printers**.

> **Nota:** Agregar archivos en `public/downloads/` normalmente no exige rebuild de Next.js; sí reiniciá el proceso si cambiaste código de la app.

### URL personalizada (opcional)

Si servís los binarios desde CDN u otro origen:

```env
NEXT_PUBLIC_KAI_PRINTERS_ANDROID_URL=https://cdn.tu-dominio.cl/kai-printers-android-1.1.8.apk
NEXT_PUBLIC_KAI_PRINTERS_WINDOWS_URL=https://cdn.tu-dominio.cl/kai-printers-windows-1.0.2-x64-portable.zip
NEXT_PUBLIC_KAI_PRINTERS_MACOS_URL=https://cdn.tu-dominio.cl/kai-printers-macos-1.0.2-aarch64.dmg
```

---

## Kai Screen — publicar APK Android

```bash
npm run kai-screen:publish
```

| Archivo | En git |
|---------|--------|
| `kai-screen-android-{version}.apk` | No |
| `kai-screen-android.manifest.json` | Sí |

Mismo flujo de rsync al VPS que Kai Printers.

---

## Git

No commitees `.apk`, `.zip` ni `.dmg`. Sí commiteá los manifest JSON y las guías `.md`.

## Guías operador

- Kai Printers Android: [INSTALACION_ANDROID.md](./INSTALACION_ANDROID.md)
- Kai Screen Android: [INSTALACION_KAI_SCREEN_ANDROID.md](./INSTALACION_KAI_SCREEN_ANDROID.md)
