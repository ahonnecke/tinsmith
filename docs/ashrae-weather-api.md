# ASHRAE Weather Station API Integration

How the project setup page fetches design conditions from the ASHRAE 2021 Handbook of Fundamentals.

## ⚠️ Upstream status — `request_places.php` is down (verified 2026-07-15)

This is a reverse-engineered API with no SLA, and half of it is currently broken:

| Endpoint | Status |
|---|---|
| `request_places.php` (lat/lng → nearest WMO stations) | **HTTP 500, empty body — universally** |
| `request_meteo_parametres.php` (WMO → design conditions) | **200, works** |

The 500 reproduces across multiple coordinates, `ashrae_version` 2017/2021/2025,
`number=1` and `number=5`, with and without session cookies, and with full
browser headers. The site root returns 200, so the host is up — the endpoint
itself is failing server-side.

Because `lookupWeatherData()` calls `fetchStations()` first, **the whole
per-station path is dead** even though the design-conditions half works. Callers
degrade to `buildStateFallback()` (18 states only).

Two ways out, neither of which needs this endpoint:
1. **Static WMO station table** — ship a lat/lng → nearest-WMO lookup and call
   `request_meteo_parametres.php` directly. That endpoint works, and this drops
   the dependency on the flaky finder permanently.
2. **RESNET Appendix A** — free, offline, per-county design temps; bypasses
   ashrae-meteo.info entirely. See `sizing-methodology.md`.

Also note: the site's own cookie now sets `ashrae_version=2025`, while
`ashrae-client.ts` hardcodes `2021`. Not the cause of the 500, but likely stale
for the endpoint that does work.

Reproduce:
```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST 'https://ashrae-meteo.info/v3.0/request_places.php' \
  -H 'Content-Type: application/x-www-form-urlencoded' -H 'Referer: https://ashrae-meteo.info/v3.0/' \
  --data 'lat=39.739&long=-104.985&number=5&ashrae_version=2021'          # -> 500

curl -s -X POST 'https://ashrae-meteo.info/v3.0/request_meteo_parametres.php' \
  -H 'Content-Type: application/x-www-form-urlencoded' -H 'Referer: https://ashrae-meteo.info/v3.0/' \
  --data 'wmo=724690&ashrae_version=2021&si_ip=IP'                        # -> 200 + data
```

## Architecture

```
User clicks "Fetch Weather Data" on setup page
  │
  ├─ Client: POST /api/weather?city=Atlanta&state=GA&zip=30309
  │
  ├─ Server: geocodeAddress() via Nominatim
  │     └─ GET nominatim.openstreetmap.org/search → { lat, lng }
  │
  ├─ Server: fetchStations() via ASHRAE
  │     └─ POST ashrae-meteo.info/v3.0/request_places.php → nearest WMO stations
  │
  ├─ Server: fetchDesignConditions() via ASHRAE
  │     └─ POST ashrae-meteo.info/v3.0/request_meteo_parametres.php → ~300 climate keys
  │
  ├─ Server: extract 4 required conditions, return JSON
  │
  ├─ Client: PUT /api/projects/:id { weather_station, design_conditions }
  └─ Client: display station info + design conditions table
```

## API Endpoint

`GET /api/weather` accepts either:
- `?lat=33.63&lng=-84.44` — direct coordinates
- `?city=Atlanta&state=GA&zip=30309&address=100+Main+St` — geocoded via Nominatim

Returns:
```json
{
  "station": { "name": "ATLANTA HARTSFIELD-JACKSON", "id": "722190", "elevation": "308 ft", "lat": "33.630 N", "lon": "-84.442 W" },
  "designConditions": [
    { "condition": "1% Cooling", "db": 91.6, "wb": 73.6, "dp": null, "hr": null, "label": "Peak cooling design" },
    { "condition": "1% Dehu", "db": 80.4, "wb": null, "dp": 73.3, "hr": 0.0184, "label": "Peak dehumidification" },
    { "condition": "99% Heating", "db": 26.4, "wb": null, "dp": null, "hr": null, "label": "Heating design (99%)" },
    { "condition": "99.6% Heating", "db": 21.7, "wb": null, "dp": null, "hr": null, "label": "Heating design (99.6%)" }
  ],
  "allStations": [ ... ]
}
```

## ASHRAE API Details

The upstream API at `ashrae-meteo.info` is **not REST** — it's a PHP backend behind an Angular SPA.

### Endpoints (v3.0)

Both require browser-like headers:
```
Content-Type: application/x-www-form-urlencoded
Referer: https://ashrae-meteo.info/v3.0/
Origin: https://ashrae-meteo.info
```

**Step 1: Station Search**
```
POST /v3.0/request_places.php
Body: lat=33.630&long=-84.442&number=5&ashrae_version=2021
```

Returns `{ meteo_stations: [{ wmo, place, lat, long, elev }] }`

**Step 2: Design Conditions**
```
POST /v3.0/request_meteo_parametres.php
Body: wmo=722190&ashrae_version=2021&si_ip=IP
```

Returns `{ meteo_stations: [{ ...~300 climate keys... }] }`

### Key Mappings

| Condition | JSON Key | Example |
|-----------|----------|---------|
| 1% Cooling DB | `cooling_DB_MCWB_1_DB` | 91.6 |
| 1% Cooling MCWB | `cooling_DB_MCWB_1_MCWB` | 73.6 |
| 1% Dehu DP | `dehumidification_DP/MCDB_and_HR_1_DP` | 73.3 |
| 1% Dehu MCDB | `dehumidification_DP/MCDB_and_HR_1_MCDB` | 80.4 |
| 1% Dehu HR | `dehumidification_DP/MCDB_and_HR_1_HR` | 128.5 (grains/lb) |
| 99% Heating DB | `heating_DB_99` | 26.4 |
| 99.6% Heating DB | `heating_DB_99.6` | 21.7 |

### Gotchas

- All values returned as **strings**, not numbers
- Response has UTF-8 BOM (`\uFEFF`) — must strip before JSON.parse
- v2.0 endpoints redirect to v3.0
- Humidity ratio comes in **grains/lb** — divide by 7000 for lb/lb
- Parameter is `long` not `lng` for the station search

## Fallback

When ASHRAE API is unavailable, returns state-level estimates from a built-in lookup table (18 states covered). Response includes `fallback: true` flag so the UI can warn the user.

## Key Files

| File | Purpose |
|------|---------|
| `app/src/app/api/weather/route.ts` | Server-side proxy with geocoding + fallback |
| `app/src/app/projects/[projectId]/setup/SetupClient.tsx` | Fetch button + progress animation + display |
| `app/src/app/projects/[projectId]/setup/page.tsx` | Server page passing project data to client |
| `app/src/__tests__/api/weather.test.ts` | Tests: auth, geocoding, ASHRAE parsing, fallback |
