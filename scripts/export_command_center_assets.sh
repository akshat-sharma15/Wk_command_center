#!/usr/bin/env bash
# Exports every dashboard, chart, and dataset in this Superset instance,
# plus the connected-database metadata (host/port/user, never the
# password), into two zip files a teammate can import into their own
# local Superset with import_command_center_assets.sh.
#
# This moves chart/dashboard DEFINITIONS only. The actual data those
# charts query (Vehicle, Hub, ...) lives in the Rails backend's operations
# database and is moved separately - see
# wkcc_command_center_backend/scripts/dump_operations_db.sh.
#
# Usage: ./scripts/export_command_center_assets.sh [output_dir]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
OUT_DIR="${1:-$HOME/wkcc_exports}"
mkdir -p "$OUT_DIR"

set -a
# shellcheck disable=SC1091
source "$REPO_ROOT/.env"
set +a
export PATH="$HOME/local-tools/python-3.12/bin:$HOME/local-tools/redis:$HOME/local-tools/Postgres.app/Contents/Versions/16/bin:$PATH"
# shellcheck disable=SC1091
source "$REPO_ROOT/.venv/bin/activate"

TIMESTAMP="$(date +%Y%m%dT%H%M%S)"
DASHBOARD_FILE="$OUT_DIR/dashboards_export_${TIMESTAMP}.zip"
DATASET_FILE="$OUT_DIR/datasources_export_${TIMESTAMP}.zip"

echo "==> Exporting dashboards + charts + their datasets -> $DASHBOARD_FILE"
superset export-dashboards --dashboard-file "$DASHBOARD_FILE"

echo "==> Exporting ALL datasets, including any not yet on a dashboard -> $DATASET_FILE"
superset export-datasources --datasource-file "$DATASET_FILE"

echo "==> Done."
echo "    Send both files to your teammate, then have them run:"
echo "      ./scripts/import_command_center_assets.sh $DASHBOARD_FILE $DATASET_FILE"
