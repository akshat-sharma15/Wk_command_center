#!/usr/bin/env bash
# Starts a Celery worker (only needed for async charts/alerts/reports).
set -euo pipefail

: "${SUPERSET_CONFIG_PATH:?Run 'source scripts/dev_env.sh' first}"

celery --app=superset.tasks.celery_app:app worker --pool=prefork -O fair -c 2
