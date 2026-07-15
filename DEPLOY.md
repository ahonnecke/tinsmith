# Deploying Tinsmith

Next.js 16 / React 19 + Postgres, deployed to **Fly.io** (region `iad`). CI
deploys on push to `main` via `flyctl deploy --remote-only`.

Runtime needs exactly two secrets: `DATABASE_URL` and `JWT_SECRET`.

## How a deploy works

Push to `main` → CI runs lint, typecheck, and tests → `flyctl deploy` builds the
`prod` target of `app/Dockerfile` and releases it.

Migrations are not a manual step. `db/migrate.mjs` runs as the Fly
`release_command`:

```toml
[deploy]
  release_command = "node db/migrate.mjs"
```

It applies `db/migrations` then `db/seed` against `DATABASE_URL`, recording each
file in a `schema_migrations` ledger so reruns are no-ops. A fresh Postgres is
migrated and seeded on first deploy; every redeploy applies only new files. Each
file runs in its own transaction — a failure rolls back and exits non-zero,
failing the deploy rather than serving a half-migrated database.

> **The ledger keys on filename, not on a hash of the contents.** Editing a
> migration or seed that has already run changes what a *fresh* database gets
> while leaving every existing database untouched. Always fix forward with a new
> file. `db/seed/003_rebrand_demo_identity.sql` exists because of exactly this.

`db/init.sh` is the local docker-compose init path and is not used on Fly.

## First deploy to a new Fly app

```bash
fly apps create <app-name>
fly postgres create --name <app-name>-db
fly postgres attach <app-name>-db --app <app-name>    # sets DATABASE_URL
fly secrets set JWT_SECRET="$(openssl rand -hex 32)" --app <app-name>
```

Set `app = '<app-name>'` in `app/fly.toml`, add a `FLY_API_TOKEN` deploy token
(`fly tokens create deploy -a <app-name>`) to the repository's Actions secrets,
then push to `main`.

## Smoke test

```bash
curl -s https://<app-name>.fly.dev/api/health          # -> {"ok":true,...,"db":"connected"}
curl -s -X POST https://<app-name>.fly.dev/api/auth/demo   # -> 200 + session
```

Then walk the `/estimate` wizard and the demo login end to end.

Demo credentials are seeded: `admin@demo.tinsmith.dev` / `password123`. These are
intentionally public demo values, not secrets.

## Known runtime caveat

The ASHRAE per-station weather lookup is **broken upstream**
(`request_places.php` → HTTP 500; see [docs/ashrae-weather-api.md]). Sizing
degrades to state-level or climate-zone design temperatures and reports which
source it used — it does not fail. Don't advertise per-station design conditions
as working until that upstream recovers or the lookup is replaced.

[docs/ashrae-weather-api.md]: docs/ashrae-weather-api.md
