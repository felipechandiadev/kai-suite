# Descargas agentes locales (Kai Printers + Kai CFD)

Los instalables **no** se sirven desde el POS. POS y Admin leen los manifests desde una carpeta pública
configurada en **`KAI_DOWNLOADS_URL`** y enlazan los binarios que esos manifests nombran.

Esta carpeta (`kai-pos/public/downloads/`) solo contiene las guías de instalación para operadores.

## Cómo funciona

```env
# kai-pos y kai-admin (.env) — runtime, no requiere rebuild
KAI_DOWNLOADS_URL=https://cdn.tu-dominio.cl/kai-downloads
```

El servidor lee (cache 5 min):

| Manifest | Binario que nombra (`filename`) |
|----------|---------------------------------|
| `kai-printers-android.manifest.json` | `kai-printers-android-{version}.apk` |
| `kai-printers-windows.manifest.json` | `kai-printers-windows-{version}-x64-portable.zip` |
| `kai-printers-macos.manifest.json` | `kai-printers-macos-{version}-aarch64.dmg` |
| `kai-screen-android.manifest.json` | `kai-screen-android-{version}.apk` |

El link de descarga es `${KAI_DOWNLOADS_URL}/${filename}`. Si falta el env o un manifest no responde,
esa plataforma no se ofrece en **Configuración → Impresión local** / **Pantalla cliente**.

Overrides opcionales (URL directa al binario, sin manifest): `NEXT_PUBLIC_KAI_PRINTERS_ANDROID_URL`,
`NEXT_PUBLIC_KAI_PRINTERS_WINDOWS_URL`, `NEXT_PUBLIC_KAI_PRINTERS_MACOS_URL`, `NEXT_PUBLIC_KAI_SCREEN_ANDROID_URL`.
`NEXT_PUBLIC_KAI_PRINTERS_DOWNLOADS_BASE` se acepta como nombre legacy de `KAI_DOWNLOADS_URL`.

## Sacar una versión nueva

1. Compilar y preparar los archivos (desde la raíz del monorepo):

   ```bash
   npm run kai-printers:release                     # Kai Printers Android + Windows + macOS
   npm run kai-printers:release -- --windows-only --build
   npm run kai-printers:release -- --android-only --bump patch
   npm run kai-screen:release                       # Kai CFD Android
   ```

   Todo queda en **`dist/kai-downloads/`** (fuera de git; otra carpeta con `KAI_DOWNLOADS_OUT_DIR`).

2. Subir **binarios y manifests** de `dist/kai-downloads/` a la carpeta de `KAI_DOWNLOADS_URL`.
   Subí primero el binario y después el manifest, para que nunca apunte a un archivo inexistente.

3. Commitear solo los bumps de versión del código (`version.properties`, `tauri.conf.json`, etc.).

No hace falta redeploy del POS: en ≤ 5 minutos aparece la versión nueva.

## Verificar

- `https://cdn.tu-dominio.cl/kai-downloads/kai-printers-windows.manifest.json`
- POS → **Configuración → Impresión local → Descargar Kai Printers**

## Guías operador

- Kai Printers Android: [INSTALACION_ANDROID.md](./INSTALACION_ANDROID.md)
- Kai CFD Android: [INSTALACION_KAI_SCREEN_ANDROID.md](./INSTALACION_KAI_SCREEN_ANDROID.md)
