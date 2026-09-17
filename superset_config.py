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
