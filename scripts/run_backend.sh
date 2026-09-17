#!/usr/bin/env bash
# Starts the Superset backend dev server (Flask, with debug/reload).
set -euo pipefail

: "${SUPERSET_CONFIG_PATH:?Run 'source scripts/dev_env.sh' first}"

superset run -p "${SUPERSET_WEBSERVER_PORT:-8088}" --with-threads --reload --debugger
