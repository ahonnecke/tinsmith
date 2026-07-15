import type { WeatherStation, DesignCondition } from './types';

/**
 * ASHRAE ashrae-meteo.info v3.0 API client.
 *
 * This is a reverse-engineered API — no official documentation exists.
 * The upstream returns BOM-prefixed JSON and uses form-encoded POST bodies.
 *
 * Flow:
 *   1. POST request_places.php with lat/lng → nearest WMO weather stations
 *   2. POST request_meteo_parametres.php with WMO code → full design conditions
 *
 * Resolves with { station, designConditions, allStations } on success.
 * Resolves with null if no station found.
 * Rejects on network/server errors.
 */

const ASHRAE_BASE = 'https://ashrae-meteo.info/v3.0';
const ASHRAE_HEADERS = {
  'Content-Type': 'application/x-www-form-urlencoded',
  'Referer': 'https://ashrae-meteo.info/v3.0/',
  'Origin': 'https://ashrae-meteo.info',
  'User-Agent': 'HVAC-Calculator-App/1.0',
};

/** Raw station record from the ASHRAE places endpoint. */
interface AshraeStationRaw {
  wmo: string;
  place: string;
  lat: string;
  long: string;
  elev: string;
}

/** Successful weather lookup result. */
export interface WeatherLookupResult {
  station: WeatherStation;
  designConditions: DesignCondition[];
  allStations: { wmo: string; name: string; lat: string; lon: string; elevation: string }[];
}

/** State-level fallback design conditions when ASHRAE API is unavailable. */
export const STATE_FALLBACKS: Record<string, { cooling_db: number; heating_db_99: number; heating_db_996: number }> = {
  FL: { cooling_db: 93, heating_db_99: 38, heating_db_996: 33 },
  TX: { cooling_db: 99, heating_db_99: 28, heating_db_996: 22 },
  GA: { cooling_db: 93, heating_db_99: 24, heating_db_996: 20 },
  NC: { cooling_db: 93, heating_db_99: 22, heating_db_996: 18 },
  CA: { cooling_db: 89, heating_db_99: 38, heating_db_996: 35 },
  NY: { cooling_db: 89, heating_db_99: 8, heating_db_996: 4 },
  IL: { cooling_db: 91, heating_db_99: -1, heating_db_996: -5 },
  OH: { cooling_db: 89, heating_db_99: 4, heating_db_996: 0 },
  VA: { cooling_db: 93, heating_db_99: 18, heating_db_996: 14 },
  PA: { cooling_db: 89, heating_db_99: 8, heating_db_996: 4 },
  MI: { cooling_db: 89, heating_db_99: 2, heating_db_996: -3 },
  LA: { cooling_db: 95, heating_db_99: 32, heating_db_996: 28 },
  AL: { cooling_db: 95, heating_db_99: 26, heating_db_996: 22 },
  SC: { cooling_db: 95, heating_db_99: 26, heating_db_996: 22 },
  TN: { cooling_db: 93, heating_db_99: 16, heating_db_996: 12 },
  CO: { cooling_db: 91, heating_db_99: 2, heating_db_996: -3 },
  AZ: { cooling_db: 107, heating_db_99: 37, heating_db_996: 33 },
  WA: { cooling_db: 85, heating_db_99: 22, heating_db_996: 18 },
};

function stripBom(text: string): string {
  return text.replace(/^\uFEFF/, '').replace(/^\xEF\xBB\xBF/, '');
}

function parseNum(val: string | undefined | null): number | null {
  if (val == null || val === '') return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

function grainsToLbPerLb(grains: number | null): number | null {
  if (grains == null) return null;
  return Math.round((grains / 7000) * 10000) / 10000;
}

export async function geocodeAddress(address: string, city: string, state: string, zip: string): Promise<{ lat: number; lng: number }> {
  const parts = [address, city, state, zip].filter(Boolean).join(', ');
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(parts)}&countrycodes=us&limit=1`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'HVAC-Calculator-App/1.0' },
  });

  if (!res.ok) throw new Error(`Geocoding failed: ${res.status}`);

  const data = await res.json();
  if (!data || data.length === 0) throw new Error('Address not found');

  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}

async function fetchStations(lat: number, lng: number): Promise<AshraeStationRaw[]> {
  const body = new URLSearchParams({
    lat: lat.toFixed(3),
    long: lng.toFixed(3),
    number: '5',
    ashrae_version: '2021',
  });

  const res = await fetch(`${ASHRAE_BASE}/request_places.php`, {
    method: 'POST',
    headers: ASHRAE_HEADERS,
    body: body.toString(),
  });

  if (!res.ok) throw new Error(`Station lookup failed: ${res.status}`);

  const text = await res.text();
  const data = JSON.parse(stripBom(text));
  return data.meteo_stations || [];
}

async function fetchDesignConditions(wmo: string): Promise<Record<string, string>> {
  const body = new URLSearchParams({
    wmo,
    ashrae_version: '2021',
    si_ip: 'IP',
  });

  const res = await fetch(`${ASHRAE_BASE}/request_meteo_parametres.php`, {
    method: 'POST',
    headers: ASHRAE_HEADERS,
    body: body.toString(),
  });

  if (!res.ok) throw new Error(`Design conditions fetch failed: ${res.status}`);

  const text = await res.text();
  const data = JSON.parse(stripBom(text));
  const stations = data.meteo_stations;
  if (!stations || stations.length === 0) throw new Error('No data returned for station');
  return stations[0];
}

/**
 * Look up ASHRAE design conditions for a lat/lng.
 * Returns station data + 4 design conditions (cooling, dehu, heating 99%, heating 99.6%).
 * Throws on network/server errors.
 */
export async function lookupWeatherData(lat: number, lng: number): Promise<WeatherLookupResult> {
  const stations = await fetchStations(lat, lng);
  if (stations.length === 0) throw new Error('No stations found near coordinates');

  const nearest = stations[0];
  const raw = await fetchDesignConditions(nearest.wmo);

  const coolingDb = parseNum(raw['cooling_DB_MCWB_1_DB']);
  const coolingWb = parseNum(raw['cooling_DB_MCWB_1_MCWB']);
  const dehuDp = parseNum(raw['dehumidification_DP/MCDB_and_HR_1_DP']);
  const dehuDb = parseNum(raw['dehumidification_DP/MCDB_and_HR_1_MCDB']);
  const dehuHrGrains = parseNum(raw['dehumidification_DP/MCDB_and_HR_1_HR']);
  const heating99 = parseNum(raw['heating_DB_99']);
  const heating996 = parseNum(raw['heating_DB_99.6']);

  return {
    station: {
      name: nearest.place,
      id: nearest.wmo,
      elevation: `${nearest.elev} ft`,
      lat: `${nearest.lat} N`,
      lon: `${nearest.long} W`,
    },
    designConditions: [
      { condition: '1% Cooling', db: coolingDb, wb: coolingWb, dp: null, hr: null, label: 'Peak cooling design' },
      { condition: '1% Dehu', db: dehuDb, wb: null, dp: dehuDp, hr: grainsToLbPerLb(dehuHrGrains), label: 'Peak dehumidification' },
      { condition: '99% Heating', db: heating99, wb: null, dp: null, hr: null, label: 'Heating design (99%)' },
      { condition: '99.6% Heating', db: heating996, wb: null, dp: null, hr: null, label: 'Heating design (99.6%)' },
    ],
    allStations: stations.map(s => ({
      wmo: s.wmo,
      name: s.place,
      lat: s.lat,
      lon: s.long,
      elevation: s.elev,
    })),
  };
}

/**
 * Build a fallback WeatherLookupResult from state-level estimates.
 * Returns null if no fallback data exists for the given state.
 */
export function buildStateFallback(state: string, lat: number, lng: number, errorMessage: string): (WeatherLookupResult & { fallback: true; error: string }) | null {
  const fb = STATE_FALLBACKS[state.toUpperCase()];
  if (!fb) return null;

  return {
    station: {
      name: `${state.toUpperCase()} (Estimated)`,
      id: 'fallback',
      elevation: '—',
      lat: `${lat.toFixed(2)}`,
      lon: `${lng.toFixed(2)}`,
    },
    designConditions: [
      { condition: '1% Cooling', db: fb.cooling_db, wb: null, dp: null, hr: null, label: 'Peak cooling (estimated)' },
      { condition: '1% Dehu', db: null, wb: null, dp: null, hr: null, label: 'Not available (estimated)' },
      { condition: '99% Heating', db: fb.heating_db_99, wb: null, dp: null, hr: null, label: 'Heating design (estimated)' },
      { condition: '99.6% Heating', db: fb.heating_db_996, wb: null, dp: null, hr: null, label: 'Heating design (estimated)' },
    ],
    allStations: [],
    fallback: true,
    error: errorMessage,
  };
}
