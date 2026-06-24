#!/usr/bin/env bash
# Deprecated: use scripts/publish-to-pos-downloads.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "build-release-apk.sh está deprecado. Usando publish-to-pos-downloads.sh..."
exec bash "$ROOT/scripts/publish-to-pos-downloads.sh" "$@"
