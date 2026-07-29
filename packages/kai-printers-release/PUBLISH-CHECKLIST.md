# Kai Printers — tareas de compilar y publicar

Checklist operativo para sacar una nueva versión de los agentes (Android + Desktop) hacia el POS (`pwa-pos/public/downloads/`).

## 0. Antes de compilar

- [ ] Código de tickets/protocolo alineado en:
  - `@kai/print-service-client` (capabilities + payloads)
  - `kai-printers-desktop` (Rust ESC/POS + `agentCapabilities` en `ws.rs`)
  - `kai-printers-android` (`ProtocolConstants`, `TicketEscPosDispatcher`, **`PrintFormats.ticketJobTypes`**)
- [ ] Tests unitarios verdes (Android: `./gradlew :app:testDebugUnitTest`; Desktop: `cargo test` en `src-tauri` si aplica)
- [ ] Android: existe `kai-printers-android/keystore.properties` (+ keystore). Si no: `./scripts/generate-release-keystore.sh` y respaldá fuera del repo

## 1. Compilar y publicar localmente (downloads del POS)

Desde la **raíz del monorepo**:

```bash
# Todo (Android + Windows + macOS disponibles en esta máquina)
npm run kai-printers:publish -- --bump patch

# Solo Android (APK + manifest + bump)
npm run kai-printers:publish -- --android-only --bump patch

# Solo desktop (usa artefactos ya built, o --build para recompilar Tauri)
npm run kai-printers:publish -- --desktop-only --build
```

Equivalente directo:

| Plataforma | Comando |
|------------|---------|
| Android | `npm run kai-printers:publish:android` o `bash kai-printers-android/scripts/publish-to-pos-downloads.sh --bump patch` |
| Desktop | `npm run kai-printers:publish:desktop` (`--build` / `--windows-only` / `--macos-only`) |

Salida en `pwa-pos/public/downloads/`:

| Artefacto | Git |
|-----------|-----|
| `kai-printers-android-{version}.apk` | **No** |
| `kai-printers-windows-*-portable.zip` | **No** |
| `kai-printers-macos-*.dmg` | **No** |
| `kai-printers-*.manifest.json` | **Sí** |
| `kai-printers-android/version.properties` | **Sí** (si hubo bump) |

Verificar en POS local (puerto típico `5062`):

- `/settings/local-printing`
- `/downloads/kai-printers-android.manifest.json`
- descarga del APK/DMG anunciado en el manifest

## 2. Commit (solo metadatos)

```bash
git add pwa-pos/public/downloads/kai-printers-*.manifest.json \
        kai-printers-android/version.properties
# + código fuente si hubo cambios de tickets
git commit -m "chore(printers): publicar Kai Printers vX.Y.Z"
git push
```

No commitees `.apk` / `.zip` / `.dmg`.

## 3. Deploy al VPS

1. En el VPS: `git pull` (trae manifests).
2. Desde la máquina de build, **rsync/scp** los binarios a `…/pwa-pos/public/downloads/` (mismo nombre que en el manifest).
3. Reiniciar / redeploy PWA POS si hace falta para servir estáticos.

Detalle: [`pwa-pos/public/downloads/README.md`](../../pwa-pos/public/downloads/README.md).

## 4. Validación en tienda

- [ ] Instalar/actualizar agente (APK o desktop)
- [ ] POS → Impresión local → conectado (capability incluye tickets nuevos, p. ej. `pos-laundry-reception-ticket`)
- [ ] Ticket de venta + (KaiServices) guía recepción lavandería
- [ ] Dining account ticket si usás Cuentas POS

## Notas

- Orquestador: `packages/kai-printers-release/scripts/publish-all.mjs`
- CI desktop (opcional): `.github/workflows/kai-printers-desktop-release.yml`
- Guía operadores Android: `docs/KAI_PRINTERS_INSTALACION_ANDROID.md`
