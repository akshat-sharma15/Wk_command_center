#!/usr/bin/env bash
# Imports dashboards/charts/datasets produced by
# export_command_center_assets.sh into THIS machine's local Superset.
#
# Run this AFTER restoring the operations database on this machine (see
# wkcc_command_center_backend/scripts/restore_operations_db.sh) - the
# imported charts point at that database and will error until it exists.
#
# Usage: ./scripts/import_command_center_assets.sh path/to/dashboards_export.zip [path/to/datasources_export.zip]
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 path/to/dashboards_export.zip [path/to/datasources_export.zip]" >&2
  exit 1
fi

DASHBOARD_FILE="$1"
DATASET_FILE="${2:-}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

set -a
# shellcheck disable=SC1091
source "$REPO_ROOT/.env"
set +a
export PATH="$HOME/local-tools/python-3.12/bin:$HOME/local-tools/redis:$HOME/local-tools/Postgres.app/Contents/Versions/16/bin:$PATH"
# shellcheck disable=SC1091
source "$REPO_ROOT/.venv/bin/activate"

echo "==> Importing dashboards + charts + their datasets from $DASHBOARD_FILE"
superset import-dashboards --path "$DASHBOARD_FILE" --username "${SUPERSET_ADMIN_USERNAME:-admin}"

if [ -n "$DATASET_FILE" ]; then
  echo "==> Importing remaining datasets from $DATASET_FILE"
  superset import-datasources --path "$DATASET_FILE" --username "${SUPERSET_ADMIN_USERNAME:-admin}"
fi

echo "==> Done."
echo "    The operations DB password is never exported (masked for"
echo "    security), so charts will fail to load data until you:"
echo "      1. Open Settings -> Database Connections"
echo "      2. Edit 'WKCC Operations (Command Centre)'"
echo "      3. Confirm host/port match your restored DB and re-enter the"
echo "         password, then Test Connection"
