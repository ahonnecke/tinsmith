# Tinsmith

**HVAC load calculation and equipment sizing — built to know what it doesn't know.**

Tinsmith turns house attributes into a furnace and coil size, then matches real
AHRI-listed equipment to that size. Next.js 16 / React 19 + Postgres.

```bash
npm run size -- --sqft 2000 --zone 4 --insulation average --system central_ac
```

```
Tinsmith — coarse sizing estimate  [PROVISIONAL]

Inputs   2,000 sq ft · IECC zone 4 · average insulation · central_ac
Design   heating 18°F (99%) · cooling 91°F (1%) · indoor 70/75°F
         zone 4 default (no location given)

Loads (BTU/h)
  Heating         50,000
  Cooling total   48,000   (sensible 38,400 · latent 9,600)

Equipment size
  Furnace output  50,000 BTU/h
  Cooling / coil  4.5 tons  (54,000 BTU/h)

Caveats
  - Coarse estimate — not an ACCA Manual J load calculation. Expect ±25–40% vs an engineered Manual J.
  - Equipment sizing window is a provisional rule of thumb; authoritative limits require ACCA Manual S Section N2 (licensed).
  - Design temperatures are representative for the whole climate zone, not this site. Provide a location for per-station ASHRAE design conditions.
```

Those caveats are the point. Read on.

## The problem

Sizing a furnace is *generational knowledge* — the kind that lives in one
installer's head and leaves when they do. The instinct is to encode it as a
lookup table and ship confident numbers.

The trouble is that the confident numbers are mostly folklore. The real
methodology chain is public and citable:

```
ASHRAE Fundamentals Ch.14   →   ACCA Manual J 8th Ed   →   ACCA Manual S
(design conditions)             (loads from the house)     (equipment selection)
```

…but the **exact coefficients** — Manual S Section N2 sizing windows, Manual J
envelope tables — live in licensed books. A source-verification pass over the
commonly-cited numbers (the ones repeated freely across the internet, and by
LLMs) **refuted** them. They're widely quoted and wrong.

## The design consequence

An engine that can't get authoritative coefficients has two options: guess and
sound confident, or be explicit about the boundary. Tinsmith does the second, and
the honesty is structural rather than decorative:

- **Every result is `provisional: true`**, and carries its `caveats` and
  `sources` as runtime data — not comments, not docs. They ride the API response
  and render in the UI. You cannot use this engine and not see them.
- **Coefficients are quarantined** in one file, [`sizing/config.ts`][config],
  the designated swappable boundary. Replace it with licensed values and no
  caller changes.
- **Design conditions carry provenance** — `ashrae-station`, `state-fallback`,
  or `zone-default`. A result never hides where its weather came from.
- **Refuted numbers are refused.** An earlier version of the equipment selector
  hardcoded a 90–125% capacity window attributed to "ACCA Manual S". Those exact
  percentages are the ones verification refuted, and the value silently
  disagreed with a second window elsewhere in the codebase. Both were collapsed
  into one honestly-labelled constant.

The sharpest example is an asymmetry that looks like a bug and isn't:

> **Heating load scales with the site's design temperature. Cooling doesn't.**
>
> Heating is defensible: at the heating design hour Manual J credits neither
> solar nor internal gain, so the load is essentially all conduction and
> infiltration and follows `UA·ΔT`. Scaling it is physics, not a fitted
> coefficient.
>
> Cooling isn't. It's part solar and internal gain, which don't track outdoor
> temperature, and cooling ΔT is small enough (~20°F) that naive ΔT-scaling
> would swing the load ~25% for a 4°F shift. Separating those terms needs the
> licensed Manual J tables. So cooling stays keyed to climate zone, and the
> output says so.
>
> The easy move was to scale both and look sophisticated. That would have been
> wrong in a way no test would catch.

## What's here

```
app/
  src/domains/
    sizing/       # the coarse engine: config (coefficients), calculate, match, design-conditions
    equipment/    # AHRI selection, moisture balance, good/better/best tiering
    weather/      # ASHRAE design-condition client
    estimate/     # public cost-estimate wizard
  src/cli/        # npm run size — the engine, no browser needed
  db/             # migrations + seed + idempotent runner
docs/             # methodology, sources, and what's still unverified
etl/              # AHRI SQLite → Postgres import
```

Start with [`docs/sizing-methodology.md`][method] — the cited chain and, more
usefully, the table of open items that require the licensed books. The Status
section below is where the project actually stands.

## Status

The **coarse (free) tier works end to end** — engine, AHRI matching, public
wizard, CLI. 61 tests pass.

Known and deliberate:

- **The pro tier is blocked on a purchase, not on code.** Manual J8 + Manual S
  (~$50–100) are the legitimate source of the exact coefficients. Until they're
  in hand, `config.ts` holds public proxies and says so.
- **The ASHRAE per-station lookup is broken upstream.** `request_places.php`
  (lat/lng → station) returns HTTP 500 universally; its sibling
  `request_meteo_parametres.php` (WMO → conditions) works fine. Since the client
  resolves the station first, locations currently degrade to a state-level
  estimate. The engine reports which source it used rather than papering over
  it. See [`docs/ashrae-weather-api.md`][weather].
- **The equipment catalog is a 5-row-per-table demo seed**, largest AC 3 tons —
  so a typical 2,000 sq ft house finds no cooling match. The bulk AHRI data
  isn't distributed here; `etl/etl.py` imports it.

## Running it

See [`app/README.md`](app/README.md) — docker Postgres + `npm run dev`, or just
`npm run size` for the engine with no database at all.

## License

Copyright © 2026 Ashton Honnecke. All rights reserved — see [LICENSE](LICENSE).
Published to be read, not reused.

The engineering standards it implements are separately copyrighted: ACCA Manual J
and Manual S are licensed works, and this repo contains none of their tables or
coefficients — only public proxies, clearly labelled, with citations telling you
which book to buy.

[config]: app/src/domains/sizing/config.ts
[method]: docs/sizing-methodology.md
[weather]: docs/ashrae-weather-api.md
