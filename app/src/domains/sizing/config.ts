/**
 * Coarse sizing coefficients — the swappable boundary.
 *
 * ⚠️ PROVISIONAL DATA. These are public rule-of-thumb / IECC-derived proxies,
 * NOT the licensed ACCA Manual J tables or Manual S Section N2 sizing limits.
 * The deep-research adversarial pass (docs/sizing-methodology.md) REFUTED the
 * commonly-cited Manual S sizing percentages — so the windows below are labelled
 * estimates, not authoritative. Replace this whole file with licensed values to
 * graduate to the pro tier; the engine contract does not change.
 *
 * Sources:
 *  - Design temps: representative per-IECC-zone values. For per-county precision
 *    swap in RESNET Appendix A Table A-1 (1% cooling / 99% heating, free).
 *  - Load factors: common HVAC rules of thumb by climate zone (BTU/h per sq ft),
 *    a stand-in for a UA model built on IECC R402 prescriptive U-factors.
 *  - Sizing window: widely-cited ranges; UNVERIFIED vs Manual S N2.
 */
import type { ClimateZone, DesignConditions, InsulationTier } from './types';

export const ABSOLUTE_ZERO_GUARD = 1; // °F of ΔT below which scaling is meaningless

export const INDOOR_HEATING_SETPOINT = 70; // °F, ASHRAE/Manual J typical
export const INDOOR_COOLING_SETPOINT = 75; // °F

/** Representative outdoor design dry-bulb by IECC zone, °F. PROVISIONAL. */
const ZONE_DESIGN_TEMPS: Record<ClimateZone, { heating99: number; cooling1: number }> = {
  1: { heating99: 44, cooling1: 92 }, // hot-humid (e.g. Miami)
  2: { heating99: 33, cooling1: 96 }, // hot (e.g. Houston, Phoenix)
  3: { heating99: 27, cooling1: 95 }, // warm (e.g. Atlanta)
  4: { heating99: 18, cooling1: 91 }, // mixed (e.g. Baltimore)
  5: { heating99: 6, cooling1: 89 }, // cool (e.g. Chicago)
  6: { heating99: -6, cooling1: 86 }, // cold (e.g. Minneapolis)
  7: { heating99: -16, cooling1: 83 }, // very cold (e.g. Duluth)
  8: { heating99: -27, cooling1: 78 }, // subarctic (e.g. Fairbanks)
};

/**
 * Coarse design-day load factors, BTU/h per conditioned sq ft, by zone.
 * Cooling is split into sensible/latent via a coarse sensible heat ratio.
 * PROVISIONAL rules of thumb (~400–600 sq ft/ton ≈ 20–30 BTU/h/sq ft cooling).
 */
const ZONE_LOAD_FACTORS: Record<
  ClimateZone,
  { heating: number; cooling: number; sensibleHeatRatio: number }
> = {
  1: { heating: 9, cooling: 30, sensibleHeatRatio: 0.7 }, // high latent in humid south
  2: { heating: 14, cooling: 28, sensibleHeatRatio: 0.72 },
  3: { heating: 18, cooling: 26, sensibleHeatRatio: 0.75 },
  4: { heating: 25, cooling: 24, sensibleHeatRatio: 0.8 },
  5: { heating: 32, cooling: 22, sensibleHeatRatio: 0.82 },
  6: { heating: 40, cooling: 20, sensibleHeatRatio: 0.85 },
  7: { heating: 48, cooling: 18, sensibleHeatRatio: 0.85 },
  8: { heating: 58, cooling: 16, sensibleHeatRatio: 0.88 },
};

/** Envelope multiplier from coarse insulation tier. PROVISIONAL. */
const INSULATION_MULTIPLIER: Record<InsulationTier, number> = {
  poor: 1.25,
  average: 1.0,
  good: 0.82,
};

/**
 * Provisional equipment sizing window. ⚠️ NOT Manual S N2.
 * Cooling sized to the top of the window to avoid undersizing at the coarse tier;
 * heating sized to fully cover the design heating load.
 */
export const SIZING_WINDOW = {
  /** Cooling capacity as a fraction of total cooling load. UNVERIFIED. */
  coolingMaxFraction: 1.15,
  /** Heating output as a fraction of design heating load. UNVERIFIED. */
  heatingFraction: 1.0,
};

/**
 * The one capacity window used to match catalog equipment against a target size.
 *
 * ⚠️ PROVISIONAL — these are NOT ACCA Manual S Section N2 limits. Earlier code
 * carried a second, contradictory window (0.90–1.25) labelled "ACCA Manual S";
 * those exact percentages were REFUTED by the source-verification pass
 * (docs/sizing-methodology.md, "Open items"), so the claim was removed rather
 * than propagated. Both the coarse matcher and the project-level selection
 * engine now read this single definition. Replace with N2 values once the
 * licensed Manual S is in hand — no caller changes required.
 */
export const MATCH_WINDOW = {
  coolingMin: 0.95,
  coolingMax: 1.15,
  heatingMin: 0.95,
  /** Furnaces tolerate more heating oversizing than coils do. */
  heatingMax: 1.4,
  /** Floor used when nothing lands in the window and the search widens. */
  wideningFloor: 0.8,
};

export function vintageMultiplier(yearBuilt?: number | null): number {
  // Older homes leak more; coarse infiltration proxy. PROVISIONAL.
  if (!yearBuilt) return 1.0;
  if (yearBuilt < 1980) return 1.2;
  if (yearBuilt < 2000) return 1.08;
  if (yearBuilt < 2010) return 1.0;
  return 0.92;
}

export function insulationMultiplier(tier: InsulationTier): number {
  return INSULATION_MULTIPLIER[tier];
}

export function loadFactors(zone: ClimateZone) {
  return ZONE_LOAD_FACTORS[zone];
}

export function designConditions(zone: ClimateZone): DesignConditions {
  const t = ZONE_DESIGN_TEMPS[zone];
  return {
    climateZone: zone,
    heating99Pct: t.heating99,
    cooling1Pct: t.cooling1,
    indoorHeatingSetpoint: INDOOR_HEATING_SETPOINT,
    indoorCoolingSetpoint: INDOOR_COOLING_SETPOINT,
    source: 'zone-default',
    stationName: null,
  };
}

/**
 * The heating ΔT (°F) that a zone's rule-of-thumb load factor is calibrated at,
 * i.e. the ΔT implied by that zone's representative design temp. Real site
 * conditions are scaled against this — see heatingDeltaTRatio in ./calculate.
 */
export function zoneReferenceHeatingDeltaT(zone: ClimateZone): number {
  return INDOOR_HEATING_SETPOINT - ZONE_DESIGN_TEMPS[zone].heating99;
}

export const COARSE_SOURCES = [
  'IECC climate zones (DOE/IECC)',
  'Common HVAC sizing rules of thumb (~400–600 sq ft/ton)',
];

/** Appended to sources when the site's design temps came from a real station. */
export const ASHRAE_STATION_SOURCE =
  'ASHRAE 2021 per-station design conditions (ashrae-meteo.info)';

/** Appended to sources when only the zone's representative temps were available. */
export const ZONE_DEFAULT_SOURCE =
  'Representative ASHRAE-style design temps by zone (provide a location for per-station values)';

export const COARSE_CAVEATS = [
  'Coarse estimate — not an ACCA Manual J load calculation. Expect ±25–40% vs an engineered Manual J.',
  'Equipment sizing window is a provisional rule of thumb; authoritative limits require ACCA Manual S Section N2 (licensed).',
];

/**
 * Why cooling does not track the site design temperature while heating does.
 * Stated in the output so the asymmetry reads as deliberate, not as a bug.
 */
export const COOLING_NOT_SCALED_CAVEAT =
  'Cooling load is keyed to the climate zone, not the site design temperature: cooling load is part solar and internal gain, which do not scale with outdoor temperature. Separating those needs the licensed ACCA Manual J tables.';
