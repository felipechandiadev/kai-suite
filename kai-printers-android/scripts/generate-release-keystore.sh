#!/usr/bin/env bash
# Genera keystore release para Kai Printers (una sola vez por organización).
# Respalda release/ y keystore.properties en lugar seguro; sin ellos no podrás publicar actualizaciones.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

RELEASE_DIR="$ROOT/release"
KEYSTORE="$RELEASE_DIR/kaistore-kaiprinters.jks"
PROPS="$ROOT/keystore.properties"
ALIAS="kaiprinters"

if [[ -f "$KEYSTORE" && -f "$PROPS" ]]; then
  echo "Ya existe $KEYSTORE y keystore.properties — no se sobrescribe."
  exit 0
fi

mkdir -p "$RELEASE_DIR"

if [[ -z "${KAI_PRINTERS_KEYSTORE_PASSWORD:-}" ]]; then
  if command -v openssl >/dev/null 2>&1; then
    KAI_PRINTERS_KEYSTORE_PASSWORD="$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)"
  else
    echo "Define KAI_PRINTERS_KEYSTORE_PASSWORD o instala openssl para generar una contraseña."
    exit 1
  fi
fi

PASS="$KAI_PRINTERS_KEYSTORE_PASSWORD"

keytool -genkeypair -v \
  -storetype PKCS12 \
  -keystore "$KEYSTORE" \
  -alias "$ALIAS" \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass "$PASS" \
  -keypass "$PASS" \
  -dname "CN=Kai Printers, OU=KaiStore, O=KaiStore"

cat > "$PROPS" <<EOF
storeFile=release/kaistore-kaiprinters.jks
storePassword=$PASS
keyAlias=$ALIAS
keyPassword=$PASS
EOF

chmod 600 "$PROPS" 2>/dev/null || true

echo ""
echo "Keystore creado: $KEYSTORE"
echo "Config: $PROPS"
echo ""
echo "IMPORTANTE: respalda release/ y keystore.properties (gestor de contraseñas / backup cifrado)."
echo "Sin este keystore no podrás actualizar la app en tablets ya instaladas."
