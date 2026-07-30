#!/usr/bin/env bash
# Deprecated wrapper — use services/kai-osrm/scripts/osrm-bootstrap.sh
set -euo pipefail
SUITE_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
exec "$SUITE_ROOT/services/kai-osrm/scripts/osrm-bootstrap.sh" "$@"
