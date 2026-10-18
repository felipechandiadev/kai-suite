#!/usr/bin/env bash
# Deprecated: use scripts/stage-downloads.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "build-release-apk.sh está deprecado. Usando stage-downloads.sh..."
exec bash "$ROOT/scripts/stage-downloads.sh" "$@"
