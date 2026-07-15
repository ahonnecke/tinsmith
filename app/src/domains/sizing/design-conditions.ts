/**
 * Bridge: ASHRAE weather lookup -> sizing design conditions.
 *
 * The weather domain already resolves an address to a WMO station and its
 * ASHRAE design conditions; this adapts that shape into what the sizing engine
 * consumes, so a site-specific run stops relying on the per-zone proxy table in
 * ./config. Anything the lookup cannot supply falls back to the zone default,
 * and the resulting `source` records which of the two won.
 */
import type { WeatherLookupResult } from '../weather/ashrae-client';
import { designConditions } from './config';
import type { ClimateZone, DesignConditions } from './types';

/** Design-condition rows are keyed by these labels in the weather client. */
const COOLING_1PCT = '1% Cooling';
const HEATING_99PCT = '99% Heating';

function dryBulbFor(result: WeatherLookupResult, condition: string): number | null {
  return result.designConditions.find((c) => c.condition === condition)?.db ?? null;
}

/**
 * Map a successful weather lookup onto design conditions for `zone`.
 *
 * A lookup that resolved to a real station but is missing either dry-bulb is
 * treated as unusable rather than half-trusted: mixing a station heating temp
 * with a zone-default cooling temp would report a provenance neither value has.
 * Returns null in that case so the caller falls back cleanly.
 */
export function designConditionsFromWeather(
  result: WeatherLookupResult & { fallback?: true },
  zone: ClimateZone,
): DesignConditions | null {
  const cooling1Pct = dryBulbFor(result, COOLING_1PCT);
  const heating99Pct = dryBulbFor(result, HEATING_99PCT);
  if (cooling1Pct == null || heating99Pct == null) return null;

  const base = designConditions(zone);
  return {
    ...base,
    heating99Pct,
    cooling1Pct,
    source: result.fallback ? 'state-fallback' : 'ashrae-station',
    stationName: result.station.name,
  };
}
