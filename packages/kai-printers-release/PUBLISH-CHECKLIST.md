# Kai Printers — tareas de compilar y publicar

Checklist operativo para sacar una nueva versión de los agentes (Android + Desktop) y publicarla en la carpeta pública de `KAI_DOWNLOADS_URL`.

Conceptos (identidad vs JSON de versión): [`docs/apps/RELEASE-MANIFESTS.md`](../../docs/apps/RELEASE-MANIFESTS.md) · labels nativos: [`docs/apps/MANIFESTOS-NATIVOS.md`](../../docs/apps/MANIFESTOS-NATIVOS.md).

## 0. Antes de compilar

- [ ] Código de tickets/protocolo alineado en:
  - `@kai/print-service-client` (capabilities + payloads)
  - `kai-printers-desktop` (Rust ESC/POS + `agentCapabilities` en `ws.rs`)
  - `kai-printers-android` (`ProtocolConstants`, `TicketEscPosDispatcher`, **`PrintFormats.ticketJobTypes`**)
- [ ] Tests unitarios verdes (Android: `./gradlew :app:testDebugUnitTest`; Desktop: `cargo test` en `src-tauri` si aplica)
- [ ] Android: existe `kai-printers-android/keystore.properties` (+ keystore). Si no: `./scripts/generate-release-keystore.sh` y respaldá fuera del repo

## 1. Compilar y preparar archivos

Desde la **raíz del monorepo**:

```bash
# Todo (Android + Windows + macOS disponibles en esta máquina)
npm run kai-printers:release -- --bump patch

# Solo Android (APK + manifest + bump)
npm run kai-printers:release -- --android-only --bump patch

# Solo desktop (usa artefactos ya built, o --build para recompilar Tauri)
npm run kai-printers:release -- --desktop-only --build
```

Equivalente directo:

| Plataforma | Comando |
|------------|---------|
| Android | `npm run kai-printers:release:android` o `bash kai-printers-android/scripts/stage-downloads.sh --bump patch` |
| Desktop | `npm run kai-printers:release:desktop` (`--build` / `--windows-only` / `--macos-only`) |

Salida en `dist/kai-downloads/` (fuera de git):

| Artefacto |
|-----------|
| `kai-printers-android-{version}.apk` |
| `kai-printers-windows-*-portable.zip` |
| `kai-printers-macos-*.dmg` |
| `kai-printers-*.manifest.json` |

## 2. Subir a la carpeta pública

- [ ] Subir binarios y luego manifests a la carpeta de `KAI_DOWNLOADS_URL` (mismo nombre de archivo que en el manifest)
- [ ] Verificar `${KAI_DOWNLOADS_URL}/kai-printers-*.manifest.json` en el navegador

POS y Admin toman la versión nueva en ≤ 5 minutos, sin redeploy.

## 3. Commit (solo versiones de código)

```bash
git add kai-printers-android/version.properties \
        kai-printers-desktop/src-tauri/tauri.conf.json kai-printers-desktop/src-tauri/Cargo.toml
# + código fuente si hubo cambios de tickets
git commit -m "chore(printers): Kai Printers vX.Y.Z"
git push
```

No commitees `.apk` / `.zip` / `.dmg` ni `kai-printers-desktop/release/windows/`.

Detalle: [`kai-pos/public/downloads/README.md`](../../kai-pos/public/downloads/README.md).

## 4. Validación en tienda

- [ ] Instalar/actualizar agente (APK o desktop)
- [ ] POS → Impresión local → conectado (capability incluye tickets nuevos, p. ej. `pos-laundry-reception-ticket`)
- [ ] Ticket de venta + (KaiServices) guía recepción lavandería
- [ ] Dining account ticket si usás Cuentas POS

## Notas

- Orquestador: `packages/kai-printers-release/scripts/stage-all.mjs`
- CI desktop (opcional): `.github/workflows/kai-printers-desktop-release.yml`
- Guía operadores Android: `docs/KAI_PRINTERS_INSTALACION_ANDROID.md`
