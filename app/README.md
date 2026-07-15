# Tinsmith — app

HVAC airflow calculations and equipment sizing. Next.js 16 / React 19 + Postgres.

## Local development

Postgres runs in docker; the app runs natively for fast hot-reload.

```bash
# 1. start postgres (auto-migrates + seeds on first boot)
docker compose up -d postgres

# 2. run the app (env is read from .env.local)
npm install        # first time only
npm run dev
```

- App: http://localhost:3000 — the estimate wizard is the homepage.
- Postgres: localhost:5433 (db/user `tinsmith`, password `tinsmith_dev`).
- `.env.local` (gitignored) points the app at that DB; `npm run dev` loads it
  automatically.

### Demo login
Seeded admin: `admin@demo.tinsmith.dev` (or the one-click "Try Demo" button).

### Reset the database
The seed runs only on first boot of a fresh volume. To reseed:

```bash
docker compose down -v && docker compose up -d postgres
```

To apply new migrations against a running DB without wiping it:

```bash
npm run migrate    # applies db/migrations + db/seed via DATABASE_URL, idempotent
```

### Fully containerized (optional)
`docker compose up` also builds and runs the app container on port 3001.

## Sizing CLI (no browser needed)

Run the sizing engine + AHRI matching straight from the terminal:

```bash
npm run size -- --sqft 2000 --zone 4 --insulation average --system central_ac
npm run size -- --sqft 1500 --zone 6 --system heat_pump --json
npm run size -- --sqft 2400 --zone 3 --no-match             # skip the DB lookup
npm run size -- --sqft 2000 --zone 5 --city Denver --state CO   # real design temps
```

Flags: `--sqft` (required), `--zone` 1-8, `--insulation` poor|average|good,
`--year`, `--system` central_ac|heat_pump|furnace|mini_split|dual_fuel,
`--no-match`, `--json`. Matching reads `DATABASE_URL` (auto-loaded from
`.env.local`); `--no-match` needs no database.

Location flags (`--address`, `--city`, `--state`, `--zip`) resolve the site's
real design conditions, which the heating load then scales against. The report
always names its source — ASHRAE station, state estimate, or zone default.

> The per-station ASHRAE lookup is currently **broken upstream**, so locations
> fall back to a state-level estimate (18 states) or the zone default. The CLI
> tells you which one it used. See `../docs/ashrae-weather-api.md`.

## Checks

```bash
npm test         # vitest
npm run typecheck
npm run lint
```

## Layout

```
src/
  app/            # Next.js routes + API
  domains/        # estimate (cost funnel), sizing (Manual J/S coarse engine),
                  # equipment, weather, projects, auth, units, audit
  lib/            # db pool, api-result, withAuth
db/               # migrations + seed + migrate.mjs runner
```

Sizing methodology and data sources: `../docs/sizing-methodology.md`.
