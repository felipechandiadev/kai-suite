#!/usr/bin/env bash
# Build release APK, publish versioned binary to kai-pos/public/downloads, update manifest JSON.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPO_ROOT="$(cd "$ROOT/.." && pwd)"
VERSION_FILE="$ROOT/version.properties"
DOWNLOADS_DIR="$REPO_ROOT/kai-pos/public/downloads"
MANIFEST_FILE="$DOWNLOADS_DIR/kai-printers-android.manifest.json"

BUMP=""

usage() {
  echo "Usage: $0 [--bump patch|minor|code-only]"
  echo "  --bump patch     increment patch in VERSION_NAME and VERSION_CODE"
  echo "  --bump minor     increment minor in VERSION_NAME and VERSION_CODE"
  echo "  --bump code-only increment VERSION_CODE only (default when --bump omitted: code-only)"
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --bump)
      BUMP="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      ;;
    *)
      echo "Unknown argument: $1"
      usage
      ;;
  esac
done

if [[ -z "$BUMP" ]]; then
  BUMP="code-only"
fi

if [[ ! -f "$VERSION_FILE" ]]; then
  echo "Missing $VERSION_FILE"
  exit 1
fi

read_version_properties() {
  VERSION_NAME=""
  VERSION_CODE=""
  while IFS='=' read -r key value; do
    case "$key" in
      VERSION_NAME) VERSION_NAME="$value" ;;
      VERSION_CODE) VERSION_CODE="$value" ;;
    esac
  done < <(grep -E '^[A-Z_]+=' "$VERSION_FILE")
  VERSION_NAME="${VERSION_NAME:-1.0.0}"
  VERSION_CODE="${VERSION_CODE:-1}"
}

read_version_properties

bump_version() {
  local name="${VERSION_NAME:-1.0.0}"
  local code="${VERSION_CODE:-1}"
  local major minor patch rest
  IFS='.' read -r major minor patch rest <<< "$name"
  major="${major:-0}"
  minor="${minor:-0}"
  patch="${patch:-0}"

  case "$BUMP" in
    patch)
      patch=$((patch + 1))
      ;;
    minor)
      minor=$((minor + 1))
      patch=0
      ;;
    code-only)
      ;;
    *)
      echo "Invalid --bump value: $BUMP"
      usage
      ;;
  esac

  code=$((code + 1))
  VERSION_NAME="${major}.${minor}.${patch}"
  VERSION_CODE="$code"

  cat > "$VERSION_FILE" <<EOF
VERSION_NAME=${VERSION_NAME}
VERSION_CODE=${VERSION_CODE}
EOF
}

bump_version
echo "Building Kai Printers Android v${VERSION_NAME} (${VERSION_CODE})..."

cd "$ROOT"

if [[ ! -f keystore.properties ]]; then
  echo "No hay keystore.properties — generando keystore release..."
  bash scripts/generate-release-keystore.sh
fi

./gradlew :app:assembleRelease :app:testDebugUnitTest

OUT="$ROOT/app/build/outputs/apk/release/app-release.apk"
APK_NAME="kai-printers-android-${VERSION_NAME}.apk"
DEST="$DOWNLOADS_DIR/$APK_NAME"

if [[ ! -f "$OUT" ]]; then
  echo "No se encontró $OUT"
  exit 1
fi

mkdir -p "$DOWNLOADS_DIR"
rm -f "$DOWNLOADS_DIR"/kai-printers-android-*.apk
cp "$OUT" "$DEST"

BUILT_AT="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
cat > "$MANIFEST_FILE" <<EOF
{
  "version": "${VERSION_NAME}",
  "versionCode": ${VERSION_CODE},
  "filename": "${APK_NAME}",
  "builtAt": "${BUILT_AT}"
}
EOF

ls -lh "$DEST"
echo ""
echo "Manifest: $MANIFEST_FILE"
echo "URL local: http://localhost:5032/downloads/${APK_NAME}"
echo ""
echo "Commitear solo el manifest (el APK queda fuera de git):"
echo "  git add kai-pos/public/downloads/kai-printers-android.manifest.json kai-printers-android/version.properties"
