/**
 * Coarse furnace + coil sizing — type contract.
 *
 * This is the FREE/COARSE tier: a transparent rule-of-thumb load + sizing model
 * keyed to IECC climate zone. It is deliberately NOT a Manual J calculation and
 * NOT Manual S equipment selection — those require the licensed ACCA books
 * (see docs/sizing-methodology.md). Every result is flagged `provisional` and
 * carries caveats so nothing here is mistaken for engineered sizing.
 *
 * The coefficients live in ./config as the swappable boundary: replace them with
 * Manual J Tables / Manual S Section N2 values to graduate to the pro tier.
 */

/** IECC / DOE climate zones 1 (hot) .. 8 (subarctic). */
export type ClimateZone = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type InsulationTier = 'poor' | 'average' | 'good';

/** What the coarse engine needs. Derivable from the wizard + a climate zone. */
export interface SizingInput {
  floorAreaSqft: number;
  climateZone: ClimateZone;
  insulationTier: InsulationTier;
  /** Used only to nudge the infiltration/tightness multiplier. */
  yearBuilt?: number | null;
  stories?: number | null;
  /**
   * Real design conditions for the site, when a weather lookup succeeded.
   * Absent, the engine falls back to the zone's representative pair.
   * Heating load scales with the resulting ΔT; cooling does not (see calculate.ts).
   */
  design?: DesignConditions;
}

/** Design-day loads, BTU/h. Coarse. */
export interface Loads {
  heatingBtuh: number;
  coolingSensibleBtuh: number;
  coolingLatentBtuh: number;
  coolingTotalBtuh: number;
}

/** Resulting equipment sizes. */
export interface EquipmentSizing {
  /** Required furnace/heat output at the burner/coil, BTU/h. */
  heatingOutputBtuh: number;
  /** Nominal cooling capacity, BTU/h, after the (provisional) sizing window. */
  coolingBtuh: number;
  /** Same capacity expressed in nominal tons (12,000 BTU/h = 1 ton). */
  coolingTons: number;
}

/**
 * Where a set of design conditions came from. Ranked best → worst; the engine
 * reports this so a result never hides the provenance of its weather data.
 */
export type DesignSource =
  /** Per-station ASHRAE design conditions for the actual location. */
  | 'ashrae-station'
  /** State-level estimate — ASHRAE lookup failed but the state is known. */
  | 'state-fallback'
  /** No location: one representative pair for the whole IECC zone. */
  | 'zone-default';

export interface DesignConditions {
  climateZone: ClimateZone;
  heating99Pct: number; // outdoor design dry-bulb, °F
  cooling1Pct: number; // outdoor design dry-bulb, °F
  indoorHeatingSetpoint: number; // °F
  indoorCoolingSetpoint: number; // °F
  source: DesignSource;
  /** Weather station / locale the conditions describe. Null for zone defaults. */
  stationName?: string | null;
}

export interface SizingResult {
  loads: Loads;
  equipment: EquipmentSizing;
  design: DesignConditions;
  /** Always true for the coarse tier. */
  provisional: true;
  /** Human-readable accuracy + methodology caveats to surface in the UI. */
  caveats: string[];
  /** Where the coarse coefficients come from. */
  sources: string[];
}

// ── AHRI equipment matching ──────────────────────────────────────────────────

export type DesiredSystemType =
  | 'central_ac'
  | 'heat_pump'
  | 'furnace'
  | 'mini_split'
  | 'dual_fuel';

/** A real AHRI-listed model whose capacity fits the coarse target size. */
export interface EquipmentMatch {
  kind: 'ac' | 'heat_pump' | 'furnace';
  manufacturer: string;
  model: string;
  /** Rated capacity, BTU/h (cooling for AC/HP, output for furnaces). */
  capacityBtuh: number;
  /** Nominal tons for cooling equipment; null for furnaces. */
  tons: number | null;
  efficiency: { seer?: number; hspf?: number; afue?: number };
  /** Rated capacity as a % of the coarse target (100% = exact). */
  fitPct: number;
}

export interface EquipmentMatchRequest {
  coolingBtuh: number;
  heatingOutputBtuh: number;
  systemType?: DesiredSystemType | null;
}

export interface EquipmentMatches {
  cooling: EquipmentMatch[];
  heating: EquipmentMatch[];
  caveats: string[];
}
