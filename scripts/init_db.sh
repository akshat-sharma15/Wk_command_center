#!/usr/bin/env bash
# One-time (or reset) database initialization for local dev.
# Usage: source .venv/bin/activate && source scripts/dev_env.sh && ./scripts/init_db.sh
set -euo pipefail

: "${SUPERSET_CONFIG_PATH:?Run 'source scripts/dev_env.sh' first}"
: "${SUPERSET_ADMIN_USERNAME:?Run 'source scripts/dev_env.sh' first}"

echo "==> Running database migrations"
superset db upgrade

echo "==> Creating admin user (idempotent-ish: will fail harmlessly if it already exists)"
superset fab create-admin \
  --username "$SUPERSET_ADMIN_USERNAME" \
  --firstname "$SUPERSET_ADMIN_FIRSTNAME" \
  --lastname "$SUPERSET_ADMIN_LASTNAME" \
  --email "$SUPERSET_ADMIN_EMAIL" \
  --password "$SUPERSET_ADMIN_PASSWORD" || true

echo "==> Running superset init (roles, permissions, examples skipped)"
superset init

echo "==> Done. Start the app with: ./scripts/run_backend.sh"
