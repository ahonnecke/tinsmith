/**
 * Tinsmith sizing CLI — run the coarse sizing engine + AHRI matching from the
 * terminal (no browser needed). Reuses the same engine the web wizard uses.
 *
 *   npm run size -- --sqft 2000 --zone 4 --insulation average --system central_ac
 *   npm run size -- --sqft 1500 --zone 6 --system heat_pump --json
 *   npm run size -- --sqft 2400 --zone 3 --no-match      # skip the DB lookup
 *   npm run size -- --sqft 2000 --zone 4 --city Denver --state CO   # real design temps
 *
 * Matching needs DATABASE_URL (auto-loaded from .env.local for local dev).
 * Location flags hit the network (Nominatim + ashrae-meteo.info); without them
 * the engine uses the climate zone's representative design temps.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { calculateSizing } from '@/domains/sizing/calculate';
import { designConditionsFromWeather } from '@/domains/sizing/design-conditions';
import { buildStateFallback, geocodeAddress, lookupWeatherData } from '@/domains/weather/ashrae-client';
import type { ClimateZone, DesignConditions, InsulationTier, DesiredSystemType } from '@/domains/sizing/types';

// ── Load .env.local so DATABASE_URL is set before the db pool is imported ──────
function loadEnvLocal() {
  if (process.env.DATABASE_URL) return;
  try {
    const envPath = join(dirname(fileURLToPath(import.meta.url)), '../../.env.local');
    for (const line of readFileSync(envPath, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {
    /* no .env.local — DATABASE_URL must be set in the environment for matching */
  }
}

// ── Tiny arg parser ───────────────────────────────────────────────────────────
function parseArgs(argv: string[]) {
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) flags[key] = true;
    else { flags[key] = next; i++; }
  }
  return flags;
}

const SYSTEMS: DesiredSystemType[] = ['central_ac', 'heat_pump', 'furnace', 'mini_split', 'dual_fuel'];
const TIERS: InsulationTier[] = ['poor', 'average', 'good'];

function usage(msg?: string): never {
  if (msg) console.error(`error: ${msg}\n`);
  console.error(`Tinsmith sizing CLI

  --sqft <n>            conditioned floor area (required)
  --zone <1-8>          IECC climate zone (default 4)
  --insulation <tier>   poor | average | good (default average)
  --year <yyyy>         year built (optional)
  --system <type>       ${SYSTEMS.join(' | ')} (default central_ac)
  --no-match            skip the AHRI equipment lookup (no DB needed)
  --json                emit JSON instead of a text report

Location (optional — yields real ASHRAE per-station design temps):
  --address <str>       street address
  --city <str>          city
  --state <XX>          two-letter state; enables the state-level fallback
  --zip <n>             postal code`);
  process.exit(msg ? 1 : 0);
}

/**
 * Resolve the site's design conditions from a location, mirroring the API's
 * ladder: per-station ASHRAE -> state estimate -> zone default. A location that
 * cannot be resolved is reported, never silently swapped for the zone proxy.
 */
async function resolveDesign(
  args: Record<string, string | boolean>,
  zone: ClimateZone,
): Promise<{ design?: DesignConditions; note?: string }> {
  const address = typeof args.address === 'string' ? args.address : '';
  const city = typeof args.city === 'string' ? args.city : '';
  const state = typeof args.state === 'string' ? args.state : '';
  const zip = typeof args.zip === 'string' ? args.zip : '';
  if (!address && !city && !state && !zip) return {};

  let coords: { lat: number; lng: number };
  try {
    coords = await geocodeAddress(address, city, state, zip);
  } catch (err) {
    return { note: `Could not geocode that location (${err instanceof Error ? err.message : String(err)}) — using zone defaults.` };
  }

  try {
    const weather = await lookupWeatherData(coords.lat, coords.lng);
    const design = designConditionsFromWeather(weather, zone);
    if (design) return { design };
    return { note: 'Weather station returned incomplete design data — using zone defaults.' };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    const fallback = state ? buildStateFallback(state, coords.lat, coords.lng, reason) : null;
    if (fallback) {
      const design = designConditionsFromWeather(fallback, zone);
      if (design) return { design, note: `ASHRAE lookup failed (${reason}) — fell back to a ${state.toUpperCase()} state estimate.` };
    }
    return { note: `ASHRAE lookup failed (${reason}) — using zone defaults.` };
  }
}

const n = (v: number) => v.toLocaleString('en-US');
const pad = (s: string, w: number) => s.padEnd(w);

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.h) usage();

  const sqft = Number(args.sqft);
  if (!sqft || sqft <= 0) usage('--sqft is required and must be a positive number');

  const zone = Number(args.zone ?? 4);
  if (!Number.isInteger(zone) || zone < 1 || zone > 8) usage('--zone must be an integer 1-8');

  const insulation = (args.insulation ?? 'average') as InsulationTier;
  if (!TIERS.includes(insulation)) usage(`--insulation must be one of: ${TIERS.join(', ')}`);

  const system = (args.system ?? 'central_ac') as DesiredSystemType;
  if (!SYSTEMS.includes(system)) usage(`--system must be one of: ${SYSTEMS.join(', ')}`);

  const { design, note } = await resolveDesign(args, zone as ClimateZone);

  const sizing = calculateSizing({
    floorAreaSqft: sqft,
    climateZone: zone as ClimateZone,
    insulationTier: insulation,
    yearBuilt: args.year ? Number(args.year) : null,
    design,
  });

  let matches = null;
  if (!args['no-match']) {
    try {
      loadEnvLocal();
      const { matchEquipment } = await import('@/domains/sizing/match');
      const { default: pool } = await import('@/lib/db');
      matches = await matchEquipment({
        coolingBtuh: sizing.equipment.coolingBtuh,
        heatingOutputBtuh: sizing.equipment.heatingOutputBtuh,
        systemType: system,
      });
      await pool.end();
    } catch (err) {
      matches = { error: err instanceof Error ? err.message : String(err) };
    }
  }

  if (args.json) {
    console.log(JSON.stringify({ input: { sqft, zone, insulation, system }, note, sizing, matches }, null, 2));
    return;
  }

  const d = sizing.design;
  const provenance =
    d.source === 'ashrae-station' ? `ASHRAE station: ${d.stationName}`
    : d.source === 'state-fallback' ? `state estimate: ${d.stationName}`
    : `zone ${zone} default (no location given)`;

  console.log(`\nTinsmith — coarse sizing estimate  [PROVISIONAL]\n`);
  console.log(`Inputs   ${n(sqft)} sq ft · IECC zone ${zone} · ${insulation} insulation · ${system}`);
  console.log(`Design   heating ${d.heating99Pct}°F (99%) · cooling ${d.cooling1Pct}°F (1%) · indoor ${d.indoorHeatingSetpoint}/${d.indoorCoolingSetpoint}°F`);
  console.log(`         ${provenance}\n`);
  if (note) console.log(`Note     ${note}\n`);

  console.log(`Loads (BTU/h)`);
  console.log(`  ${pad('Heating', 16)}${n(sizing.loads.heatingBtuh)}`);
  console.log(`  ${pad('Cooling total', 16)}${n(sizing.loads.coolingTotalBtuh)}   (sensible ${n(sizing.loads.coolingSensibleBtuh)} · latent ${n(sizing.loads.coolingLatentBtuh)})\n`);

  console.log(`Equipment size`);
  console.log(`  ${pad('Furnace output', 16)}${n(sizing.equipment.heatingOutputBtuh)} BTU/h`);
  console.log(`  ${pad('Cooling / coil', 16)}${sizing.equipment.coolingTons.toFixed(1)} tons  (${n(sizing.equipment.coolingBtuh)} BTU/h)\n`);

  if (matches && 'error' in matches) {
    console.log(`Equipment matching unavailable: ${matches.error}`);
    console.log(`(run with --no-match, or ensure DATABASE_URL / docker postgres is up)\n`);
  } else if (matches) {
    console.log(`Equipment that fits (AHRI)`);
    const row = (label: string, items: typeof matches.cooling) => {
      if (items.length === 0) return;
      console.log(`  ${label}`);
      for (const m of items) {
        const eff = [
          m.efficiency.seer != null ? `${m.efficiency.seer} SEER` : '',
          m.efficiency.hspf != null ? `${m.efficiency.hspf} HSPF` : '',
          m.efficiency.afue != null ? `${m.efficiency.afue}% AFUE` : '',
        ].filter(Boolean).join(' · ');
        const cap = m.tons != null ? `${m.tons} tons · ${n(m.capacityBtuh)} BTU/h` : `${n(m.capacityBtuh)} BTU/h`;
        console.log(`    ${pad(`${m.manufacturer} ${m.model}`, 28)} ${cap} · ${eff}   (${m.fitPct}% of size)`);
      }
    };
    row('Cooling', matches.cooling);
    row('Heating', matches.heating);
    console.log();
  }

  console.log(`Caveats`);
  for (const c of sizing.caveats) console.log(`  - ${c}`);
  if (matches && !('error' in matches)) for (const c of matches.caveats) console.log(`  - ${c}`);
  console.log();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack : err);
  process.exit(1);
});
