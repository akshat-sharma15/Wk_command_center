#!/usr/bin/env bash
# Source this file to load local dev environment variables into your shell:
#   source scripts/dev_env.sh
set -a
# shellcheck disable=SC1091
source "$(dirname "${BASH_SOURCE[0]}")/../.env"
set +a
