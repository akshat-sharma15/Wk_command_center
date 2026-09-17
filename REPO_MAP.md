# Repo Map

A new developer's guide to what lives where in this repository. For "how do
I get this running", see [DEVELOPMENT_SETUP.md](DEVELOPMENT_SETUP.md). For
"why does it look like this", see [ARCHITECTURE.md](ARCHITECTURE.md). This
file is just: which folder, for what.

## The three things you'll actually touch day to day

| Folder | What it is | You'll edit this when... |
|---|---|---|
| [`superset/`](superset/) | Python/Flask backend - the core app: models, REST APIs, business logic, DB connectors, security/RBAC | Adding/changing an API endpoint, a data model, a permission, a DB engine spec |
| [`superset-frontend/src/`](superset-frontend/src/) | React/TypeScript frontend - dashboards, Explore (chart builder), SQL Lab, the app shell | Adding/changing a UI, a page, a chart control, dashboard behavior |
| [`superset-frontend/plugins/`](superset-frontend/plugins/) | Individual chart type implementations (one package per chart, e.g. bar, pie, table) | Adding a new chart type or fixing how an existing chart renders |

Everything else below exists, but most day-to-day feature work happens in
those three.

## Backend (`superset/`) internals

- `views/api/` and top-level `*/api.py` per resource (`charts/api.py`,
  `dashboards/api.py`, etc.) - REST endpoints
- `models/` and per-resource `models.py` - SQLAlchemy database models
- `commands/` (per resource) - business logic classes, the layer between API
  and model (create/update/delete/import/export commands)
- `schemas.py` (per resource) - Marshmallow schemas used for request
  validation and OpenAPI docs
- `daos/` - data-access objects, query logic shared across commands
- `connectors/`, `db_engine_specs/` - how Superset talks to different
  database engines (Postgres, MySQL, BigQuery, etc.)
- `security/` - Flask-AppBuilder RBAC, roles, permission logic
- `migrations/` - Alembic DB migrations (`superset/migrations/versions/`)
- `examples/` - sample data/dashboards loaded by `superset load_examples`
- `cli/` - `superset` CLI commands (`db upgrade`, `init`, `fab create-admin`, ...)
- `tasks/`, `async_events/` - Celery background jobs (reports, async queries)
- `mcp_service/` - Model Context Protocol service integration

## Frontend (`superset-frontend/`) internals

- `src/dashboard/` - dashboard viewing/editing
- `src/explore/` - Explore, the chart-building workflow
- `src/SqlLab/` - the SQL Lab query editor
- `src/components/` - shared/reusable React components used across the app
- `plugins/` - one npm package per chart type (`plugins/plugin-chart-echarts`,
  `plugins/plugin-chart-table`, etc.) - this is where actual chart rendering
  code lives
- `packages/` - shared libraries consumed by both `src/` and `plugins/`:
  - `packages/superset-ui-core` - **the** shared component/utility library;
    prefer importing from here over Ant Design directly (see [CLAUDE.md](CLAUDE.md))
  - `packages/superset-ui-chart-controls` - shared Explore control-panel config
  - `packages/superset-ui-switchboard` - iframe messaging (used by embedding)
  - `packages/generator-superset` - Yeoman generator for scaffolding new chart plugins
- `cypress-base/` - deprecated E2E tests (Cypress, being replaced by Playwright)
- `playwright/` - new E2E tests (Playwright)
- `spec/` - Jest unit/component tests, mirrors `src/` structure

## Standalone services (each its own package, deployed/run separately)

- [`superset-websocket/`](superset-websocket/) - Node.js WebSocket server
  used to push async query/report results to the browser (chart result
  streaming). Separate process, own `package.json`.
- [`superset-core/`](superset-core/) - `apache-superset-core` Python
  package: the extension/plugin API surface that third-party Superset
  extensions build against.
- [`superset-embedded-sdk/`](superset-embedded-sdk/) - `@superset-ui/embedded-sdk`,
  the npm package external applications use to embed a Superset dashboard
  in an iframe.
- [`superset-extensions-cli/`](superset-extensions-cli/) - CLI tool for
  scaffolding/building Superset extensions.

None of these four are started by the normal `run_backend.sh` /
`npm run dev-server` flow - see each folder's own `README.md` if you need
to work on one directly.

## Everything else

| Folder | Purpose |
|---|---|
| `docs/` | Docusaurus site: contributor docs, admin docs, developer portal (auto-generated component docs from Storybook - see [CLAUDE.md](CLAUDE.md) for that pipeline) |
| `tests/` | Python test suite - `unit_tests/` (fast, no DB) and `integration_tests/` (full app + DB) |
| `requirements/` | Pinned Python dependency lists (`development.txt`, `base.txt`, `.in` sources) |
| `scripts/` | One-off and dev helper scripts - this repo's own `run_backend.sh`, `init_db.sh`, `dev_env.sh`, plus upstream tooling (migration benchmarking, translations, CI helpers) |
| `docker/` | Docker entrypoints/bootstrap scripts used by the (optional, unused in our local flow) Docker Compose setup |
| `helm/` | Helm chart for deploying Superset to Kubernetes |
| `RELEASING/` | Upstream Apache release tooling (tarballs, changelog generation, release emails) - not relevant to local dev |
| `RESOURCES/` | Misc static reference files (standard role definitions, "who uses Superset" list) |
| `CHANGELOG/` | Per-version upstream changelog snapshots |
| `ASF/` | Apache Software Foundation governance/policy files |
| `.devcontainer/` | VS Code devcontainer config |
| `.github/` | CI workflows, issue/PR templates |

## Root-level docs, quick reference

- [README.md](README.md) - project overview, quick start
- [DEVELOPMENT_SETUP.md](DEVELOPMENT_SETUP.md) - full local setup, step by step
- [ARCHITECTURE.md](ARCHITECTURE.md) - current vs. intended system shape
- [CLAUDE.md](CLAUDE.md) *(= [AGENTS.md](AGENTS.md))* - coding standards and conventions for this repo, also read by AI assistants
- [UPDATING.md](UPDATING.md) - breaking-changes log
- [UPSTREAM_README.md](UPSTREAM_README.md) - original Apache Superset README, unmodified
