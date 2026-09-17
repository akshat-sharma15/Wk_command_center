# Development Setup

This guide gets a new developer from a clean clone to a running, editable
Webkorps Command Center (Apache Superset 6.1.0), running directly on the
host - **no Docker**.

## Pinned versions (do not deviate without a deliberate upgrade decision)

| Component  | Version                         | Source of truth |
|------------|----------------------------------|------------------|
| Superset   | 6.1.0 (commit `c83fb2bb1dcfac41ac51bcebd82471f4a7180d18`) | this repo's history |
| Python     | 3.10 - 3.12 (developed against 3.12.3) | `pyproject.toml` (`requires-python = ">=3.10"`) |
| Node       | 22.22.0                          | `superset-frontend/.nvmrc`, `superset-frontend/package.json` (`engines.node`) |
| npm        | ^10.8.1 (bundled with Node 22.22.0: 10.9.4) | `superset-frontend/package.json` (`engines.npm`) |
| PostgreSQL | 14+ (developed against 16.x)     | this document (see below) |
| Redis      | 6+ (developed against 7.0.x)     | this document (see below) |

See [Version pinning policy](#18-version-pinning-policy) for how to change
any of these.

---

## 1. Linux prerequisites

Tested on Ubuntu 24.04. You need, at minimum:

```bash
sudo apt update
sudo apt install -y build-essential python3.12 python3.12-venv python3.12-dev \
  libsasl2-dev libldap2-dev libssl-dev pkg-config default-libmysqlclient-dev \
  postgresql postgresql-contrib redis-server git curl
```

- `build-essential` / `*-dev` headers are needed to build some Python wheels
  (e.g. `psycopg2`, `cryptography`).
- If PostgreSQL and Redis are already running as system services (check with
  `systemctl status postgresql redis-server`), you don't need to reinstall
  them - just create a dedicated role/database (see [§5](#5-postgresql-setup)).

## 2. macOS prerequisites

Tested with Homebrew.

```bash
brew install python@3.12 postgresql@16 redis git
brew services start postgresql@16
brew services start redis
```

- Xcode Command Line Tools are required for native builds:
  `xcode-select --install`
- Apple Silicon users: `brew` installs under `/opt/homebrew`; make sure that
  prefix is on your `PATH`.

## 3. Python setup

Verify the interpreter:

```bash
python3.12 --version   # should print 3.12.x (any 3.10-3.12 works)
```

If you don't have 3.12 and your OS package manager doesn't offer it, use
[pyenv](https://github.com/pyenv/pyenv) to install a 3.10-3.12 build - do
not use a newer interpreter than what `pyproject.toml` allows.

## 4. Virtual environment

From the repo root:

```bash
python3.12 -m venv .venv
source .venv/bin/activate      # Linux/macOS
```

`.venv/` is gitignored. Every backend command below assumes this venv is
activated.

## 5. PostgreSQL setup

Create a **dedicated** role and database for this project. Do not reuse a
database from another project on the same machine.

```bash
sudo -u postgres psql <<'SQL'
CREATE ROLE wkcc_app WITH LOGIN PASSWORD 'choose-a-local-password';
CREATE DATABASE wkcc_superset OWNER wkcc_app;
SQL
```

(macOS with Homebrew Postgres running as your own user: drop `sudo -u
postgres`, just run `psql postgres`.)

Verify:

```bash
psql -h localhost -U wkcc_app -d wkcc_superset -c '\conninfo'
```

Put the role name/password/db name into your `.env` (see [§10](#10-environment-configuration)).

## 6. Redis setup

This project's config assumes Redis is reachable at `localhost:6379`, and
deliberately uses **non-default logical DB indices** (1, 2, 3) so it never
collides with db0 or with other local projects that may share the same
Redis instance:

```bash
redis-cli ping   # expect: PONG
```

No further setup is required - logical DBs don't need to be created ahead
of time.

## 7. Node/npm setup

Use `nvm` (do not install Node via your OS package manager - version drift
breaks the frontend build):

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
# restart your shell, then:
cd superset-frontend
nvm install     # reads .nvmrc -> installs/uses Node 22.22.0
nvm use
node --version  # v22.22.0
npm --version   # 10.x
```

## 8. Backend installation

From the repo root, with the venv active:

```bash
pip install --upgrade pip setuptools wheel
pip install -r requirements/development.txt
pip install -e .
```

`requirements/development.txt` is compiled/pinned (see `requirements/*.in`
for the source lists) - this is our reproducibility mechanism for Python
dependencies. Don't hand-install newer versions of individual packages.

## 9. Frontend installation

```bash
cd superset-frontend
npm ci          # NOT `npm install` - ci respects package-lock.json exactly
cd ..
```

## 10. Environment configuration

```bash
cp .env.example .env
```

Edit `.env`:
- Generate a real secret key: `openssl rand -base64 42` -> `SUPERSET_SECRET_KEY`
- Fill in the PostgreSQL role/password from [§5](#5-postgresql-setup)
- Choose a local admin password for the bootstrap admin user

Load it into your shell before running any `superset` command:

```bash
source scripts/dev_env.sh
```

Configuration is centralized in [superset_config.py](superset_config.py)
(pointed to via `SUPERSET_CONFIG_PATH` in `.env`), which reads everything
from environment variables - no secrets are hardcoded in source.

## 11. Database initialization

With the venv active and `.env` loaded:

```bash
./scripts/init_db.sh
```

This runs, in order: `superset db upgrade`, `superset fab create-admin`,
`superset init`. Safe to re-run (admin creation is skipped if the user
already exists).

## 12. Starting Superset

```bash
./scripts/run_backend.sh
```

Starts the Flask dev server on `http://localhost:8088` with `--reload`
(backend source edits under `superset/` are picked up automatically).

## 13. Starting frontend development

In a second terminal:

```bash
cd superset-frontend
nvm use
npm run dev-server
```

Starts webpack-dev-server on `http://localhost:9000`, proxying API calls
to the backend on `:8088`. Frontend source edits under `superset-frontend/src`
hot-reload. **Use `:9000` during development**, not `:8088` directly.

## 14. Running background services when required

Only needed if you're testing async charts, scheduled reports/alerts, or
Celery-backed features:

```bash
# terminal 3
source .venv/bin/activate
source scripts/dev_env.sh
./scripts/run_worker.sh
```

## 15. Troubleshooting

- **`psycopg2` fails to build**: install `libpq-dev` (Linux) or
  `postgresql` via Homebrew (macOS) so `pg_config` is on `PATH`.
- **`ModuleNotFoundError: superset_config`**: `SUPERSET_CONFIG_PATH` isn't
  set/exported - re-run `source scripts/dev_env.sh`.
- **`RuntimeError: Missing required environment variable`**: you haven't
  sourced `.env`, or a value is still blank - check `.env` against
  `.env.example`.
- **Port 8088 or 9000 already in use**: another Superset instance (e.g. an
  old Docker container) may be bound to it. Do not stop unrelated
  containers without checking with the rest of the team first; instead
  override `SUPERSET_WEBSERVER_PORT` / pass `--port` to webpack.
- **`relation "ab_user" does not exist`**: migrations haven't run - re-run
  `./scripts/init_db.sh`.
- **Redis connection refused**: confirm `redis-cli ping` works and
  `REDIS_HOST`/`REDIS_PORT` in `.env` match how Redis is actually listening.
- **npm install is extremely slow / OOMs**: use `npm ci`, not `npm install`,
  and ensure you're on Node 22 (`node --version`), not an older/newer major.

## 16. Resetting local development

To wipe and rebuild the metadata database only (keeps Postgres role):

```bash
sudo -u postgres psql -c "DROP DATABASE wkcc_superset;"
sudo -u postgres psql -c "CREATE DATABASE wkcc_superset OWNER wkcc_app;"
./scripts/init_db.sh
```

To fully reset the local checkout's dependencies:

```bash
rm -rf .venv && python3.12 -m venv .venv && source .venv/bin/activate \
  && pip install -r requirements/development.txt && pip install -e .
cd superset-frontend && rm -rf node_modules && npm ci && cd ..
```

This never touches any other project's database, Redis keys, or the
existing Docker-based Superset environment on this machine.

## 17. Git workflow

- `main` is the trunk; this repo has its own history independent of
  upstream `apache/superset`.
- Branch per feature/fix, open a PR against `main`.
- Do not commit `.env`, `.venv/`, `node_modules/`, or any generated
  credentials/build output (already covered by `.gitignore`).
- Commit messages: describe *why*, not just *what* (standard convention
  for this codebase).

## 18. Version pinning policy

- Superset stays pinned to **6.1.0** until the team explicitly decides to
  upgrade. Do not follow `master` or move to 7.x incidentally via a
  dependency bump.
- Python/Node/npm versions above are pinned via `pyproject.toml` /
  `.nvmrc` / `package.json engines` - respect those files, don't install
  ad hoc newer versions.
- `requirements/development.txt` and `superset-frontend/package-lock.json`
  are the reproducibility mechanisms for dependencies. Regenerate them
  deliberately (`pip-compile`, `npm install` to update the lockfile) rather
  than editing pinned versions by hand, and only when there's a reason to.
- Do not upgrade a dependency just because a newer version exists.

## 19. Upgrade policy

Upgrading the Superset base version (e.g. to a future 6.x point release or
7.x) is a deliberate, separate project, not an incidental side effect of
other work. Before upgrading:

1. Read the target version's `UPDATING.md` for breaking changes.
2. Diff our configuration (`superset_config.py`, `.env.example`) and any
   custom code against the new upstream source tree.
3. Test migrations against a copy of the database, not the shared dev DB.
4. Get explicit sign-off from the team before merging the upgrade.

---

## Proof of concept: custom page

To validate source-level development end-to-end, a minimal custom page has
been added (backend route + simple response). See the diff introducing it
for exactly what changed. To verify it yourself:

1. Start the backend (`./scripts/run_backend.sh`).
2. Visit the route documented in that change (see `superset/views/`).
3. Edit the handler, save, confirm the reload picks up your change without
   restarting the process.

This proves: backend source is editable, frontend source is editable, and
both dev servers reflect changes live - the four items in
[VALIDATION](#validation-checklist) most likely to silently break during a
migration like this one.

## Validation checklist

Use this to confirm a fresh clone is fully working:

- [ ] Clean clone succeeds
- [ ] `python3.12 -m venv .venv && pip install -r requirements/development.txt` succeeds
- [ ] `psql -h localhost -U wkcc_app -d wkcc_superset -c '\conninfo'` succeeds
- [ ] `redis-cli ping` returns `PONG`
- [ ] `./scripts/init_db.sh` completes with no migration errors
- [ ] Admin login works at `http://localhost:8088/login/`
- [ ] A backend source edit (e.g. a log line) is reflected after `--reload` picks it up
- [ ] A frontend source edit is reflected by webpack-dev-server without a manual rebuild
- [ ] `npm run dev-server` serves the app at `http://localhost:9000`
- [ ] A second developer, following this document alone on a clean machine, reaches the same state
