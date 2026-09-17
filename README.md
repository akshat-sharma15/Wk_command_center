<!--
Licensed to the Apache Software Foundation (ASF) under one
or more contributor license agreements.  See the NOTICE file
distributed with this work for additional information
regarding copyright ownership.  The ASF licenses this file
to you under the Apache License, Version 2.0 (the
"License"); you may not use this file except in compliance
with the License.  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing,
software distributed under the License is distributed on an
"AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, either express or implied.  See the License for the
specific language governing permissions and limitations
under the License.
-->

# Webkorps Command Center

Webkorps Command Center is our internal data/ops platform, built on top of
[Apache Superset](https://superset.apache.org/) **6.1.0**. This repository
is a source-based fork intended for direct, Docker-free local development.

This project is derivative work built on Apache Superset and is licensed
under the Apache License, Version 2.0 - see [LICENSE.txt](LICENSE.txt) and
[NOTICE](NOTICE). The original upstream README is preserved unmodified at
[UPSTREAM_README.md](UPSTREAM_README.md).

- **Base version:** Apache Superset 6.1.0 (pinned; see [Version pinning policy](DEVELOPMENT_SETUP.md#18-version-pinning-policy))
- **Upstream project:** https://github.com/apache/superset

This repository starts a fresh Git history seeded from the upstream 6.1.0
source tree. No history, plugin, or configuration from any prior internal
deployment has been carried over. See [ARCHITECTURE.md](ARCHITECTURE.md)
for the intended system shape and [DEVELOPMENT_SETUP.md](DEVELOPMENT_SETUP.md)
for the full local setup guide.

## Quick start

```bash
git clone https://github.com/akshat-sharma15/Wk_command_center.git
cd Wk_command_center

# Backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements/development.txt
pip install -e .

# Frontend (requires Node 22.22.0 - see superset-frontend/.nvmrc)
cd superset-frontend && nvm install && nvm use && npm ci && cd ..

# Configuration
cp .env.example .env   # then edit .env with your local secrets/DB creds
source scripts/dev_env.sh

# Database (requires local PostgreSQL + Redis already running)
./scripts/init_db.sh

# Run
./scripts/run_backend.sh                      # terminal 1: Flask backend on :8088
cd superset-frontend && npm run dev-server    # terminal 2: webpack dev server on :9000
```

Full details, including PostgreSQL/Redis setup and troubleshooting, are in
[DEVELOPMENT_SETUP.md](DEVELOPMENT_SETUP.md).

## Documentation

- [REPO_MAP.md](REPO_MAP.md) - what each folder is for (start here if you're new)
- [DEVELOPMENT_SETUP.md](DEVELOPMENT_SETUP.md) - complete local dev environment guide (Linux + macOS)
- [ARCHITECTURE.md](ARCHITECTURE.md) - system architecture and roadmap
- [UPDATING.md](UPDATING.md) - upstream Superset breaking-changes log (inherited; add our own entries here going forward)
- [UPSTREAM_README.md](UPSTREAM_README.md) - original Apache Superset README
- Upstream docs: https://superset.apache.org/docs/intro

## Status

This repository currently holds an **unmodified, verified-working Superset
6.1.0** source tree plus our own configuration/tooling layer, and one small
proof-of-concept custom page demonstrating source-level development. No
other custom features have been (re)implemented yet - see
[ARCHITECTURE.md](ARCHITECTURE.md) for what's planned next.
