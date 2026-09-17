# Architecture

## Current state (this repository)

An unmodified Apache Superset **6.1.0** application, running from source,
configured for local Docker-free development against a local PostgreSQL
metadata database and local Redis (cache + Celery broker/results). See
[DEVELOPMENT_SETUP.md](DEVELOPMENT_SETUP.md) for how the pieces are wired
together, and [.env.example](.env.example) / [superset_config.py](superset_config.py)
for the actual configuration surface.

```
                    Webkorps Command Center
                            |
        +-------------------+-------------------+
        |                   |                   |
   Flask backend      Webpack dev server    Celery worker
   (superset run,      (superset-frontend,   (background jobs,
    :8088)              :9000, proxies       optional for local
                         /api to :8088)       dev unless testing
        |                                     async features)
        |
   PostgreSQL (wkcc_superset)   Redis (cache db3, celery db1/db2)
```

No custom application code has been added to the Superset core yet beyond
one proof-of-concept page (see below). All of this is stock upstream 6.1.0
behavior.

## Intended future shape

```
Webkorps Command Center
        |
        +-- Superset dashboards         (stock Superset - BI/visualization)
        +-- Custom pages                (new Flask blueprints / React routes)
        +-- Custom APIs                 (new REST endpoints alongside Superset's)
        +-- RBAC                        (Flask-AppBuilder roles/permissions,
        |                                extended for our custom resources)
        +-- Future: Fleet Map           (not yet started - see below)
        |
        +-- External Alert/Notification Application   (separate repo/service,
                                                         not built yet)
```

Notes on scope, matching current decisions:

- **Fleet Map**: a future custom visualization/plugin. Not started in this
  repository. When it is built, it will be developed fresh against 6.1.0's
  plugin architecture - no code is carried over from any prior
  implementation.
- **Custom pages/APIs**: will follow Superset's existing extension points
  (Flask blueprints under `superset/`, new React routes under
  `superset-frontend/src/`) rather than forking core files where avoidable,
  to keep future upstream upgrades tractable.
- **RBAC**: will build on Flask-AppBuilder's existing role/permission model
  (already used throughout Superset) rather than introducing a parallel
  auth system.
- **Notification application**: intentionally out of scope for this
  repository. It will be a separate service/repo that talks to this one
  (e.g. via Superset's REST API or a shared database/queue), not a module
  built inside Superset's codebase. No work on it has started.

## Proof-of-concept: custom page

To validate that source-level development works end-to-end (backend edit,
frontend edit, both picked up by the dev servers without a rebuild-from-
scratch), a minimal custom page was added. See the "Proof of concept"
section of [DEVELOPMENT_SETUP.md](DEVELOPMENT_SETUP.md) for what it is and
how to verify it.

## Upgrade path

This application is pinned to Superset 6.1.0 (see
[Version pinning policy](DEVELOPMENT_SETUP.md#18-version-pinning-policy)).
Because we have not deeply forked core files, upgrading to a later Superset
release later should be feasible via `git merge`/`git subtree`-style
patching against a fresh upstream checkout, or by re-diffing our
configuration and custom additions onto a newer source tree. This is a
deliberate, future decision - not automatic.
