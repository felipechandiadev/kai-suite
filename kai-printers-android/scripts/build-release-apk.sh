#!/usr/bin/env bash
# APK release firmado → dist/kai-printers-android.apk (listo para subir al VPS)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f keystore.properties ]]; then
  echo "No hay keystore.properties — generando keystore release..."
  bash scripts/generate-release-keystore.sh
fi

./gradlew :app:assembleRelease :app:testDebugUnitTest

OUT="$ROOT/app/build/outputs/apk/release/app-release.apk"
DIST="$ROOT/dist/kai-printers-android.apk"

if [[ ! -f "$OUT" ]]; then
  echo "No se encontró $OUT"
  exit 1
fi

mkdir -p dist
cp "$OUT" "$DIST"
ls -lh "$DIST"
echo ""
echo "Subir al VPS:"
echo "  scp dist/kai-printers-android.apk usuario@VPS:/ruta/pwa-pos/public/downloads/kai-printers-android.apk"
