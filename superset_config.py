# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.
"""Local development configuration for Webkorps Command Center.

Loaded via the SUPERSET_CONFIG_PATH environment variable (see .env.example).
All secrets and environment-specific values come from the process
environment - nothing sensitive is hardcoded here. See
DEVELOPMENT_SETUP.md for how to populate `.env`.
"""

import copy
import os


def _require_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(
            f"Missing required environment variable: {name}. "
            "Did you `cp .env.example .env` and source it? "
            "See DEVELOPMENT_SETUP.md."
        )
    return value


# --- Metadata database (PostgreSQL) ---
DATABASE_HOST = _require_env("DATABASE_HOST")
DATABASE_PORT = _require_env("DATABASE_PORT")
DATABASE_DB = _require_env("DATABASE_DB")
DATABASE_USER = _require_env("DATABASE_USER")
DATABASE_PASSWORD = _require_env("DATABASE_PASSWORD")

SQLALCHEMY_DATABASE_URI = (
    f"postgresql+psycopg2://{DATABASE_USER}:{DATABASE_PASSWORD}"
    f"@{DATABASE_HOST}:{DATABASE_PORT}/{DATABASE_DB}"
)

# --- Secret key ---
SECRET_KEY = _require_env("SUPERSET_SECRET_KEY")

# --- Redis (cache, Celery broker/results) ---
REDIS_HOST = _require_env("REDIS_HOST")
REDIS_PORT = int(_require_env("REDIS_PORT"))
REDIS_CELERY_BROKER_DB = int(os.environ.get("REDIS_CELERY_BROKER_DB", 1))
REDIS_CELERY_RESULTS_DB = int(os.environ.get("REDIS_CELERY_RESULTS_DB", 2))
REDIS_CACHE_DB = int(os.environ.get("REDIS_CACHE_DB", 3))


def _redis_cache_config(db: int) -> dict:
    return {
        "CACHE_TYPE": "RedisCache",
        "CACHE_DEFAULT_TIMEOUT": 300,
        "CACHE_KEY_PREFIX": "wkcc_",
        "CACHE_REDIS_HOST": REDIS_HOST,
        "CACHE_REDIS_PORT": REDIS_PORT,
        "CACHE_REDIS_DB": db,
    }


CACHE_CONFIG = _redis_cache_config(REDIS_CACHE_DB)
DATA_CACHE_CONFIG = _redis_cache_config(REDIS_CACHE_DB)
FILTER_STATE_CACHE_CONFIG = _redis_cache_config(REDIS_CACHE_DB)
EXPLORE_FORM_DATA_CACHE_CONFIG = _redis_cache_config(REDIS_CACHE_DB)


class CeleryConfig:
    broker_url = (
        f"redis://{REDIS_HOST}:{REDIS_PORT}/{REDIS_CELERY_BROKER_DB}"
    )
    result_backend = (
        f"redis://{REDIS_HOST}:{REDIS_PORT}/{REDIS_CELERY_RESULTS_DB}"
    )
    worker_prefetch_multiplier = 1
    task_acks_late = False


CELERY_CONFIG = CeleryConfig

# --- Misc dev settings ---
SUPERSET_ENV = os.environ.get("SUPERSET_ENV", "development")
ENABLE_PROXY_FIX = False

TALISMAN_ENABLED = True

CONTENT_SECURITY_POLICY = {
    "default-src": ["'self'"],
    "connect-src": [
        "'self'",
        "http://localhost:3001",
    ],
}

# --- Branding: Webkorps Command Central ---
_BRAND_NAME = "Command Central"
_BRAND_LOGO_PATH = "/static/assets/images/command-central-logo.png"

APP_NAME = _BRAND_NAME
APP_ICON = _BRAND_LOGO_PATH
LOGO_TOOLTIP = _BRAND_NAME
LOGO_RIGHT_TEXT = _BRAND_NAME
FAVICONS = [{"href": _BRAND_LOGO_PATH}]

# The frontend renders the header logo from the `brandLogoUrl`/`brandAppName`
# *theme tokens* (falling back to APP_ICON/APP_NAME only when those tokens
# are unset), and THEME_DEFAULT/THEME_DARK below are already fully-formed
# dicts by the time this file loads - so APP_ICON/APP_NAME alone don't reach
# the header image. Rebrand both themes' tokens directly instead.
from superset.config import THEME_DARK as _DEFAULT_THEME_DARK  # noqa: E402
from superset.config import THEME_DEFAULT as _DEFAULT_THEME_DEFAULT  # noqa: E402


def _rebrand_theme(theme: dict | None) -> dict | None:
    if theme is None:
        return None
    branded = copy.deepcopy(theme)
    branded["token"]["brandAppName"] = _BRAND_NAME
    branded["token"]["brandLogoAlt"] = _BRAND_NAME
    branded["token"]["brandLogoUrl"] = _BRAND_LOGO_PATH
    return branded


THEME_DEFAULT = _rebrand_theme(_DEFAULT_THEME_DEFAULT)
THEME_DARK = _rebrand_theme(_DEFAULT_THEME_DARK)

# --- CSP: allow the Command Center Rails API (separate origin) ---
# The frontend's Action tab (src/features/actions/data/*.ts) talks directly
# to a Rails API on a different origin. Without this, Talisman's CSP
# connect-src blocks those fetches even though the Rails side allows the
# request via CORS.
from superset.config import TALISMAN_CONFIG as _DEFAULT_TALISMAN_CONFIG  # noqa: E402
from superset.config import (  # noqa: E402
    TALISMAN_DEV_CONFIG as _DEFAULT_TALISMAN_DEV_CONFIG,
)

_COMMAND_CENTER_API_ORIGIN = os.environ.get(
    "COMMAND_CENTER_API_ORIGIN", "http://localhost:3001"
)


def _allow_command_center_origin(talisman_config: dict) -> dict:
    config = copy.deepcopy(talisman_config)
    config["content_security_policy"]["connect-src"].append(
        _COMMAND_CENTER_API_ORIGIN
    )
    return config


TALISMAN_CONFIG = _allow_command_center_origin(_DEFAULT_TALISMAN_CONFIG)
TALISMAN_DEV_CONFIG = _allow_command_center_origin(_DEFAULT_TALISMAN_DEV_CONFIG)
