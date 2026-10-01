#!/usr/bin/env bash
# Source this file to load local dev environment variables into your shell:
#   source scripts/dev_env.sh
set -a
# shellcheck disable=SC1091
if [ -n "${ZSH_VERSION:-}" ]; then
	SCRIPT_PATH="${(%):-%N}"
else
	SCRIPT_PATH="${BASH_SOURCE[0]}"
fi
SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
source "$SCRIPT_DIR/../.env"
set +a

# Keep the documented host setup usable when runtimes are installed locally.
LOCAL_TOOLS="$HOME/local-tools"
export PATH="$LOCAL_TOOLS/python-3.12/bin:$LOCAL_TOOLS/node-v22.22.0-darwin-x64/bin:$LOCAL_TOOLS/redis:$LOCAL_TOOLS/Postgres.app/Contents/Versions/16/bin:$LOCAL_TOOLS/zstd/bin:$PATH"
MYSQL_CLIENT_PREFIX="$HOME/homebrew/opt/mysql-client"
export PATH="$MYSQL_CLIENT_PREFIX/bin:$PATH"
export PKG_CONFIG_PATH="$MYSQL_CLIENT_PREFIX/lib/pkgconfig:$HOME/homebrew/opt/pkgconf/lib/pkgconfig:${PKG_CONFIG_PATH:-}"
export CPPFLAGS="-I$MYSQL_CLIENT_PREFIX/include/mysql ${CPPFLAGS:-}"
export LDFLAGS="-L$MYSQL_CLIENT_PREFIX/lib ${LDFLAGS:-}"
export MYSQLCLIENT_CFLAGS="-I$MYSQL_CLIENT_PREFIX/include/mysql"
export MYSQLCLIENT_LDFLAGS="-L$MYSQL_CLIENT_PREFIX/lib -lmysqlclient"
export PATH="$HOME/.cargo/bin:$PATH"
